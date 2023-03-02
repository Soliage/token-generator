import { 
    AuthorityType, 
    createMint, 
    createSetAuthorityInstruction, 
    createTransferInstruction, 
    getAccount, 
    getOrCreateAssociatedTokenAccount, 
    mintTo
 } from '@solana/spl-token';
import { 
    Connection, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    PublicKey, 
    sendAndConfirmTransaction, 
    Transaction
 } from '@solana/web3.js';

type TokenWrapper = {
    mintAddress: PublicKey; // token address
    tokenAccount: PublicKey; // recipient's token account
}

async function createNfts(connection: Connection, wallet: Keypair): Promise<TokenWrapper> {
    const mint = await createMint(
        connection,
        wallet,
        wallet.publicKey,
        wallet.publicKey,
        0
    );
      
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        mint,
        wallet.publicKey
    );

    await mintTo(
        connection,
        wallet,
        mint,
        associatedTokenAccount.address,
        wallet,
        1
    );

    console.log(`mintPubkey: ${mint}`);
    console.log(`associatedTokenAccount: ${associatedTokenAccount.address}`);

    let transaction = new Transaction()
        .add(createSetAuthorityInstruction(
        mint,
        wallet.publicKey,
        AuthorityType.MintTokens,
        null
        ));
    
    await sendAndConfirmTransaction(connection, transaction, [wallet]);

    const accountInfo = await getAccount(connection, associatedTokenAccount.address);
    console.log(`mintPubkey: ${mint}, value: ${accountInfo.amount}`);

    return {
        mintAddress: mint, 
        tokenAccount: associatedTokenAccount.address
    }
}

async function main() {
    const connection = new Connection('http://127.0.0.1:8899');
    // const connection = new web3.Connection(web3.clusterApiUrl('devnet'))
    const wallet = Keypair.generate();
    const airdropSignature = await connection.requestAirdrop(
        wallet.publicKey,
        LAMPORTS_PER_SOL,
      );
    await connection.confirmTransaction(airdropSignature);

    let nftCollection: Array<TokenWrapper> = [];
    for (let i = 1; i <= 2; i++) {
        nftCollection.push(await createNfts(connection, wallet));
    }
    console.log(`Generated ${nftCollection.length} NFTs.`);

    const demoNft: TokenWrapper = nftCollection[0]

    const toWalletPubkey = new PublicKey('4RLpP7eio996DqLcSpV2f9mKSXsogSuezJZctmyXzroo');
    const toAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        demoNft.mintAddress,
        toWalletPubkey
    );

    const tx = new Transaction();
    tx.add(createTransferInstruction(
        demoNft.tokenAccount,
        toAccount.address,
        wallet.publicKey,
        1
    ));

    await sendAndConfirmTransaction(connection,tx,[wallet]);

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
}

main().then(() => {
    console.log("Finished successfully");
}).catch((error) => {
    console.error(error);
});