// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import "forge-std/console.sol";
import {IERC721} from "forge-std/interfaces/IERC721.sol";
import {IERC1155} from "forge-std/interfaces/IERC1155.sol";

contract ValidationTest is Test {
    function testERC721() public returns (bool[3] memory) {
        // Fork network
        try vm.envString("NETWORK") returns (string memory envNetwork) {
            vm.createSelectFork(stdChains[envNetwork].rpcUrl);
        } catch {
            // fallback to mainnet
            vm.createSelectFork(stdChains["mainnet"].rpcUrl);
        }

        address[3] memory filteredOperators = [0xEB01B6614b6c8BBfb2e2A3979501a961531bF997, 0xEB01B6614b6c8BBfb2e2A3979501a961531bF997, 0xEB01B6614b6c8BBfb2e2A3979501a961531bF997];
        address contractAddress = 0x23ccF7F93b9433cb8F30B41fc8557b07ce6812BC;
        uint256 tokenId = 1;
        IERC721 nftContract = IERC721(contractAddress);
        address owner = nftContract.ownerOf(tokenId);
        uint[3] memory results = new uint[](3);

        for (uint256 i = 0; i < filteredOperators.length; i++) {
            address operator = filteredOperators[i];

            // Try to set approval for the operator
            vm.startPrank(owner);
            try nftContract.setApprovalForAll(operator, true) {
                // blocking approvals is not required, so continue to check transfers
            } catch (bytes memory) {
                // continue to test transfer methods, since marketplace approvals can be
                // hard-coded into contracts
            }

            // also include per-token approvals as those may not be blocked
            try nftContract.approve(operator, tokenId) {
                // continue to check transfers
            } catch (bytes memory) {
                // continue to test transfer methods, since marketplace approvals can be
                // hard-coded into contracts
            }
            vm.stopPrank();

            // Ensure operator is not able to transfer the token
            vm.startPrank(operator);
            try nftContract.safeTransferFrom(owner, address(1), tokenId) {
                results[i] = false;
            } catch (bytes memory) {
                console.log("%s:%d", addr, disabled);
                vm.stopPrank();
                continue;
            }

            try nftContract.safeTransferFrom(owner, address(1), tokenId, "") {
                results[i] = false;
            } catch (bytes memory) {
                console.log("%s:%d", addr, disabled);
                vm.stopPrank();
                continue;
            }

            try nftContract.transferFrom(owner, address(1), tokenId) {
                results[i] = false;
            } catch (bytes memory) {
                console.log("%s:%d", addr, disabled);
                vm.stopPrank();
                continue;
            }
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
