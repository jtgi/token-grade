
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC721} from "forge-std/interfaces/IERC721.sol";
import {IERC1155} from "forge-std/interfaces/IERC1155.sol";

contract ValidationTest is Test {
    function testERC721() public {
        vm.createSelectFork("https://mainnet.infura.io/v3/75c6fed789494aaba4a2bd0e0084057c");

        address[9] memory filteredOperators = [0x1E0049783F008A0085193E00003D00cd54003c71, 0x00000000000111AbE46ff893f3B2fdF1F759a8A8, 0xf42aa99F011A1fA7CDA90E5E98b277E306BcA83e, 0xFED24eC7E22f573c2e08AEF55aA6797Ca2b3A051, 0x2B2e8cDA09bBA9660dCA5cB6233787738Ad68329, 0x3A3548e060Be10c2614d0a4Cb0c03CC9093fD799, 0xcDA72070E455bb31C7690a170224Ce43623d0B6f, 0x6170B3C3A54C3d8c854934cBC314eD479b2B29A3, 0x9757F2d2b135150BBeb65308D4a91804107cd8D6];
        address contractAddress = address(0xC89f705888936d710aa8dEB43A373bfCB58F3CD7);
        uint256 tokenId = 1;
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
