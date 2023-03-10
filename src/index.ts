import { 
    createTransferInstruction, 
    getAccount, 
    getOrCreateAssociatedTokenAccount, 
 } from '@solana/spl-token';
import { 
    clusterApiUrl,
    Connection, 
    PublicKey, 
    sendAndConfirmTransaction, 
    Transaction
 } from '@solana/web3.js';
import { getWalletAddress, initializeKeypairAndFund, createNft } from "./helpers";
import { TokenWrapper } from './types';
const fs = require("fs");



async function main() {
    const tokens_to_create = 4

    // const url = clusterApiUrl('devnet');
    const url = 'http://127.0.0.1:8899'
    const connection = new Connection(url);

    // First we create a connection and generate a keypair, airdropping SOL to our new keypair.
    // const wallet = await randomPayer();
    const wallet = await initializeKeypairAndFund("./.keys/soliage_dev.json");
    
    // Now we mint 10 NFTs to our new wallet and push the mint address and our wallet's 
    // token account to the nftCollection array.
    let nftCollection: Array<TokenWrapper> = [];
    let nftJson: Array<object> = [];
    
    // We select one of these NFTs for a test transfer to the steward
    const toWalletPubkey = new PublicKey('7Xjksnc8b8sZ7KyqE4e1TiJVq2tFxyzbd1Ei3TNvCsMH'); // Steward's public key
    
    for (let i = 1; i <= tokens_to_create; i++) {
        const nft = await createNft(connection, wallet)

        // First we have to generate a token account for this wallet, funding the rent for the account
        const toAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            nft.mintAddress,
            toWalletPubkey
        );

        // Then we create the transfer instruction and send and confirm our tx.
        const tx = new Transaction();
        tx.add(createTransferInstruction(
            nft.tokenAccount,
            toAccount.address,
            wallet.publicKey,
            1
        ));
        await sendAndConfirmTransaction(connection, tx, [wallet]);

        nftCollection.push(nft);
        nftJson.push({
            "id": i, 
            "mintAddress": nft.mintAddress.toBase58(), 
            "tokenAccount": nft.tokenAccount, 
            "owner": toWalletPubkey
        });
    }
    console.log(`Generated ${nftCollection.length} NFTs.`);
    console.log('Writing to tokens.json file...')
    
    const jsonFile = JSON.stringify(nftJson);
    fs.writeFile('./tokens.json', jsonFile,  function(err: string) {
        if (err) {
            return console.error(err);
        }
        console.log("File created!");
    });


    // To verify that the NFTs are in the new wallets token account, and not
    // in our own, we print the account info of both token accounts.
    const demoNft: TokenWrapper = nftCollection[0]
    const toAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        demoNft.mintAddress,
        toWalletPubkey
    );
    const fromAccountInfo = await getAccount(
        connection,
        demoNft.tokenAccount
    );
    const toAccountInfo = await getAccount(
        connection,
        toAccount.address
    );
    console.log(`From account: ${fromAccountInfo.amount}`);
    console.log(`To account: ${toAccountInfo.amount}`);

    const currentHolder = await getWalletAddress(connection, demoNft.mintAddress.toBase58());
    console.log(`Current holder: ${currentHolder}`);

    // For quicker testing purposes, we can plug in an existing mintAddress
    // const currentHolder = await getWalletAddress(connection, 'HqnbTEgA7Ha4zqvSbZYBQ319VCqYaSqtZLYcgFsPMuZK');


}

main().then(() => {
    console.log("Finished successfully");
}).catch((error) => {
    console.error(error);
});