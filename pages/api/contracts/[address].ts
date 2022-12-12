import { exec } from "child_process";
import fs from "fs-extra";
import type { NextApiRequest, NextApiResponse } from "next";
import { operators } from "../../../lib/operators";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const address = req.query.address as string;
  if (!address) {
    res.status(400).json({ error: "Missing contract address" });
    return;
  }

  const contract = createContract(
    address,
    operators.map((o) => o.address),
    process.env.RPC_URL!,
    1
  );

  initForge();
  fs.outputFileSync(`${process.cwd()}/forge/test/${address}/Validate.to.sol`, contract);

  try {
    const { stdout, stderr } = await runForge(address, { ttl: 30000 });
    const results = parseResponse(stdout);
    return res.status(200).json({ results });
  } catch (e: any) {
    console.error(e);
    return res
      .status(400)
      .json({
        error:
          "Failed to simulate transfers",
        detail: ""
      });
  } finally {
    fs.rm(`${process.cwd()}/forge/test/${address}`, { recursive: true, force: true });
    fs.rm(`${process.cwd()}/forge/out/${address}`, { recursive: true, force: true });
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
    throw new Error("somethin went wrong");
  }

  return test.decoded_logs.map((log: string) => {
    const [address, disabled = "0"] = log.split(":");

    return {
      name: operators.find(f => f.address === address)!.name,
      address,
      disabled: disabled === '1',
    }
  });
}

function runForge(
  address: string,
  { ttl = 10000 }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Forge command timed out"));
    }, ttl);

    const base = `${process.cwd()}/forge`;
    const child = exec(
      `forge test --silent --root ${base} --contracts ${base}/test/${address} --fork-url ${process
        .env.RPC_URL!} --out ${base}/out --lib-paths ${base}/lib --cache-path ${base}/cache --json`,
      (error, stdout, stderr) => {
        clearTimeout(timeout);
        return error ? reject(error) : resolve({ stdout, stderr });
      }
    );
  });
}

const foundryTOML = `
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.17" 
eth-rpc-url = "https://mainnet.infura.io"
`;

const createContract = (
  contract: string,
  operators: string[],
  rpcUrl: string,
  tokenId: number
) => `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC721} from "forge-std/interfaces/IERC721.sol";
import {IERC1155} from "forge-std/interfaces/IERC1155.sol";

contract ValidationTest is Test {
    function testERC721() public {
        vm.createSelectFork("${rpcUrl}");

        address[${ operators.length }] memory filteredOperators = [${operators.join(", ")}];
        address contractAddress = address(${contract});
        uint256 tokenId = ${tokenId};
        IERC721 nftContract = IERC721(contractAddress);
        address owner = nftContract.ownerOf(tokenId);
        address anon = address(0xdeadbeef);

        for (uint256 i = 0; i < filteredOperators.length; i++) {
            address operator = filteredOperators[i];

            vm.startPrank(owner);
            try nftContract.setApprovalForAll(operator, true) {} catch (bytes memory) {}
            try nftContract.approve(operator, tokenId) {} catch (bytes memory) {}
            vm.stopPrank();

            vm.startPrank(anon);
            try nftContract.setApprovalForAll(operator, true) {} catch (bytes memory) {}
            try nftContract.approve(operator, tokenId) {} catch (bytes memory) { }
            vm.stopPrank();

            vm.startPrank(operator);
            try nftContract.safeTransferFrom(owner, anon, tokenId) {
            } catch (bytes memory) {
                console.log("%s:%d", operator, 1);
                vm.stopPrank();
                continue;
            }

            try nftContract.transferFrom(anon, address(1), tokenId) {
            } catch (bytes memory) {
                console.log("%s:%d", operator, 1);
                vm.stopPrank();
                continue;
            }

            vm.stopPrank();
            console.log("%s:%d", operator, 0);
        }
    }

    // function testERC1155() public {
    //     IERC1155 nftContract = IERC1155(contractAddress);
    //     for (uint256 i = 0; i < filteredOperators.length; i++) {
    //         address operator = filteredOperators[i];

    //         // Try to set approval for the operator
    //         vm.prank(owner);
    //         try nftContract.setApprovalForAll(operator, true) {}
    //         catch (bytes memory) {
    //             // even if approval reverts, continue to test transfer methods, since marketplace approvals can be
    //             // hard-coded into contracts
    //         }

    //         uint256[] memory tokenIds = new uint256[](1);
    //         tokenIds[0] = tokenId;
    //         uint256[] memory amounts = new uint256[](1);
    //         amounts[0] = 1;

    //         // Ensure operator is not able to transfer the token
    //         vm.startPrank(operator);
    //         vm.expectRevert();
    //         nftContract.safeTransferFrom(owner, address(1), tokenId, 1, "");

    //         vm.expectRevert();
    //         nftContract.safeBatchTransferFrom(owner, address(1), tokenIds, amounts, "");

    //         vm.stopPrank();
    //     }
    // }
}
`;
