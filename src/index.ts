import { 
    AuthorityType, 
    createMint, 
    createSetAuthorityInstruction, 
    createTransferInstruction, 
    getAccount, 
    getMint, 
    getOrCreateAssociatedTokenAccount, 
    mintTo,
    TOKEN_PROGRAM_ID
 } from '@solana/spl-token';
import { 
    clusterApiUrl,
    Connection, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    PublicKey, 
    sendAndConfirmTransaction, 
    Transaction
 } from '@solana/web3.js';
import { randomPayer, getWalletAddress } from "./config";

const localnet = 'http://127.0.0.1:8899'

type TokenWrapper = {
    mintAddress: PublicKey; // token address
    tokenAccount: PublicKey; // recipient's token account
}

async function createNfts(connection: Connection, wallet: Keypair): Promise<TokenWrapper> {

    // This function mints a single NFT by first creating a new token with 0 decimals.
    const mint = await createMint(
        connection,
        wallet,
        wallet.publicKey,
        wallet.publicKey,
        0
    );

    // Then we generate a token account for our wallet.
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        mint,
        wallet.publicKey
    );

    // And mint a single token to ourselves.
    await mintTo(
        connection,
        wallet,
        mint,
        associatedTokenAccount.address,
        wallet,
        1
    );

    // And finally disable any future minting.
    const tx = new Transaction()
        .add(createSetAuthorityInstruction(
        mint,
        wallet.publicKey,
        AuthorityType.MintTokens,
        null
        ));
    await sendAndConfirmTransaction(connection, tx, [wallet]);

    // Finally we print the token address and how much we hold in our account.
    const accountInfo = await getAccount(connection, associatedTokenAccount.address);
    console.log(`mintPubkey: ${mint}, value: ${accountInfo.amount}`);
    
    // And return the token address and the token account address.
    return {
        mintAddress: mint, 
        tokenAccount: associatedTokenAccount.address
    }
}

async function main() {
    const connection = new Connection(localnet);

    // First we create a connection and generate a keypair, airdropping SOL to our new keypair.
    const wallet = await randomPayer();
    
    // Now we mint 10 NFTs to our new wallet and push the mint address and our wallet's 
    // token account to the nftCollection array.
    let nftCollection: Array<TokenWrapper> = [];
    for (let i = 1; i <= 1; i++) {
        nftCollection.push(await createNfts(connection, wallet));
    }
    console.log(`Generated ${nftCollection.length} NFTs.`);



    // We select one of these NFTs for a test transfer to a random wallet
    const demoNft: TokenWrapper = nftCollection[0]
    const toWalletPubkey = new PublicKey('7Xjksnc8b8sZ7KyqE4e1TiJVq2tFxyzbd1Ei3TNvCsMH'); // Steward's public key

    // First we have to generate a token account for this wallet, funding the rent for the account
    const toAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        demoNft.mintAddress,
        toWalletPubkey
    );

    // Then we create the transfer instruction and send and confirm our tx.
    const tx = new Transaction();
    tx.add(createTransferInstruction(
        demoNft.tokenAccount,
        toAccount.address,
        wallet.publicKey,
        1
    ));
    await sendAndConfirmTransaction(connection, tx, [wallet]);

    // To verify that the NFT is in the new wallets token account, and not
    // in our own, we print the account info of both token accounts.
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

    // For quicker testing purposes, we can plug in an existing mintAddress
    // const currentHolder = await getWalletAddress(connection, 'HqnbTEgA7Ha4zqvSbZYBQ319VCqYaSqtZLYcgFsPMuZK');


}

main().then(() => {
    console.log("Finished successfully");
}).catch((error) => {
    console.error(error);
});