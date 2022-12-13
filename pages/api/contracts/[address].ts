import axios from 'axios';
import { exec } from 'child_process';
import { ethers } from "ethers";
import fs from 'fs-extra';
import type { NextApiRequest, NextApiResponse } from "next";
import { operators } from "../../../lib/operators";
import { ERC1155InterfaceId, ERC165Abi, ERC721InterfaceId } from '../../../lib/util';

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
const tokenId = 1;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const raw = req.query.address as string;
  if (!raw) {
    return res.status(400).json({ error: "Address is required" });
  }

  let address = extractAddress(raw);

  if (!address) {
    return res
      .status(400)
      .json({ error: `Couldn't find a valid address in ${raw}` });
  }

  address = ethers.utils.getAddress(address);

  if ((await provider.getCode(address)) === "0x") {
    return res.status(400).json({
      error: `That looks like a wallet address`,
    });
  }

  const [test721, test1155] = await Promise.all([
    is721(address),
    is1155(address),
  ]);

  if (!test721 && !test1155) {
    return res.status(400).json({
      error: `Contract at is not an ERC721 or ERC1155`,
    });
  }

  let owner1155;
  if (test1155) {
    try {
      owner1155 = await get1155Owner(address, tokenId);
    } catch (e: any) {
      return res.status(400).json({
        error: e.message,
      });
    }
  }

  const contract = createContract(
    address,
    test721,
    operators.map((o) => o.address),
    process.env.RPC_URL!,
    tokenId,
    owner1155
  );

  initForge();
  fs.outputFileSync(
    `${process.cwd()}/forge/test/${address}/Validate.to.sol`,
    contract
  );

  try {
    const { stdout, stderr } = await runForge(address, { ttl: 30000 });
    const results = parseResponse(stdout);
    return res.status(200).json({ results });
  } catch (e: any) {
    console.error(e);
    return res.status(400).json({
      error: "Failed to simulate transfers",
      detail: "",
    });
  } finally {
    fs.rm(`${process.cwd()}/forge/test/${address}`, {
      recursive: true,
      force: true,
    });
    fs.rm(`${process.cwd()}/forge/out/${address}`, {
      recursive: true,
      force: true,
    });
  }
}

function initForge() {
  if (fs.existsSync(`${process.cwd()}/forge`)) {
    return;
  } else {
    fs.mkdirSync(`${process.cwd()}/forge`);
    fs.mkdirSync(`${process.cwd()}/forge/test`);
    fs.mkdirSync(`${process.cwd()}/forge/out`);
    fs.mkdirSync(`${process.cwd()}/forge/lib`);
    fs.mkdirSync(`${process.cwd()}/forge/cache`);
  }
}

function parseResponse(
  stdout: string
): { address: string; disabled: boolean }[] {
  const json = JSON.parse(stdout);
  const vals = Object.values(json) as any;
  const test = vals[0].test_results["testERC721()"];

  if (!test.success) {
    throw new Error("Unexpected error executing the simulation");
  }

  return test.decoded_logs.map((log: string) => {
    const [address, disabled = "0"] = log.split(":");

    return {
      name: operators.find((f) => f.address === address)!.name,
      address,
      disabled: disabled === "1",
    };
  });
}

function runForge(
  address: string,
  { ttl = 20000 }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Forge command timed out"));
    }, ttl);

    const base = `${process.cwd()}forge`;
    const cmd = `forge test --silent --root ${base} --contracts ${base}/test/${address} --fork-url ${process
        .env
        .RPC_URL!} --out ${base}/out --lib-paths ${base}/lib --cache-path ${base}/cache --json`;

    process.env.NODE_ENV === 'development' && console.log(cmd);

    const child = exec(cmd, (error, stdout, stderr) => {
      clearTimeout(timeout);
      return error ? reject(error) : resolve({ stdout, stderr });
    });
  });
}

const createContract = (
  contract: string,
  is721: boolean,
  operators: string[],
  rpcUrl: string,
  tokenId: number,
  owner1155: string = '0xdeadbeef'
) => `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC721} from "forge-std/interfaces/IERC721.sol";
import {IERC1155} from "forge-std/interfaces/IERC1155.sol";

contract ValidationTest is Test {
    function testERC721() public {
        vm.createSelectFork("${rpcUrl}");

        address[${
          operators.length
        }] memory filteredOperators = [${operators.join(", ")}];
        address contractAddress = address(${contract});
        uint256 tokenId = ${tokenId};

        for (uint256 i = 0; i < filteredOperators.length; i++) {
            address operator = filteredOperators[i];

            if (${is721}) {
              IERC721 nftContract = IERC721(contractAddress);
              address owner = nftContract.ownerOf(tokenId);
              address anon = address(0xdeadbeef);

              vm.startPrank(owner);
              try nftContract.setApprovalForAll(operator, true) {} catch (bytes memory) {}
              try nftContract.approve(operator, tokenId) {} catch (bytes memory) {}
              vm.stopPrank();

              vm.startPrank(operator);

              try nftContract.transferFrom(owner, address(1), tokenId) {
              } catch (bytes memory) {
                  console.log("%s:%d", operator, 1);
                  vm.stopPrank();
                  continue;
              }

              vm.stopPrank();
            } else {
              IERC1155 nftContract = IERC1155(contractAddress);
              address owner = address(${owner1155});
              address anon = address(0xdeadbeef);

              uint256[] memory tokenIds = new uint256[](1);
              tokenIds[0] = tokenId;
              uint256[] memory amounts = new uint256[](1);
              amounts[0] = 1;

              vm.startPrank(operator);
              try nftContract.safeTransferFrom(owner, address(1), tokenId, 1, "") {
              } catch (bytes memory) {
                  console.log("%s:%d", operator, 1);
                  vm.stopPrank();
                  continue;
              }

              vm.stopPrank(); 
            }

            console.log("%s:%d", operator, 0);
        }
    }
}
`;

function extractAddress(input: string): string | null {
  // define the regex pattern with the g flag
  const pattern = /(0x)?[a-fA-F0-9]{40}/g;

  // search the input string for matches with the regex
  const matches = input.match(pattern);

  // return the last match or null if no matches were found
  return matches ? matches.pop() || null : null;
}

async function is721(address: string) {
  return isInterfaceId(address, ERC721InterfaceId);
}

async function is1155(address: string) {
  return isInterfaceId(address, ERC1155InterfaceId);
}

async function isInterfaceId(address: string, id: string) {
  const c = new ethers.Contract(address, ERC165Abi, provider);

  try {
    return await c.supportsInterface(id);
  } catch (e) {
    return false;
  }
}


async function get1155Owner(address: string, tokenId: number) {
  try {
    const { data } = await axios.get(
      `https://eth-mainnet.g.alchemy.com/nft/v2/${process.env
        .ALCHEMY_KEY!}/getOwnersForToken?contractAddress=${address}&tokenId=${tokenId}`
    );

    if (data.owners.length === 0) {
      throw new Error("No owners found");
    } else {
      return ethers.utils.getAddress(data.owners[0]);
    }
  } catch (e) {
    console.error(e);
    throw new Error("Something unexpected happened. Try again");
  }
}