import { LAMPORTS_PER_SOL, Keypair, Connection, PublicKey, clusterApiUrl, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Account, AuthorityType, createMint, createSetAuthorityInstruction, getAccount, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from 'fs';
import { TokenWrapper } from "./types";

// anchor.setProvider(anchor.AnchorProvider.env());
// const connection = anchor.getProvider().connection;
// const connection = new Connection(clusterApiUrl('devnet'));
const url = 'http://127.0.0.1:8899'
const connection = new Connection(url);

const randomPayer = async (lamports = LAMPORTS_PER_SOL) => {
    const wallet = Keypair.generate();
    const signature = await connection.requestAirdrop(wallet.publicKey, lamports);
    await connection.confirmTransaction(signature);
    return wallet;
}

function initializeKeypair(path: string): Keypair {
    // @ts-ignore
    const parcelData = JSON.parse(fs.readFileSync(path));
    const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(parcelData));
    return keypair;
}

async function initializeKeypairAndFund(path: string): Promise<Keypair> {
    // @ts-ignore
    const parcelData = JSON.parse(fs.readFileSync(path));
    const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(parcelData));
    const signature = await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);
    return keypair;
}

async function getWalletAddress(connection: Connection, mintAccount: string): Promise<PublicKey | undefined> {
    let pubkey: PublicKey | undefined = undefined;
    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        {
            filters: [
            {
                dataSize: 165, // number of bytes
            },
            {
                memcmp: {
                offset: 0, // number of bytes
                bytes: mintAccount, // base58 encoded string
                },
            },
            ],
        }
    );

    accounts.forEach((account, i) => {
        const parsedAccountInfo:any = account.account.data;
        const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        if (tokenBalance > 0) {
            pubkey = parsedAccountInfo["parsed"]["info"]['owner'];
            console.log(
                `Found ${parsedAccountInfo["parsed"]["info"]['owner']} 
                for token account ${account.pubkey} at
                mintAddress ${mintAccount}`
              );
        }
    });

    if (pubkey === undefined) {
        throw new Error(`No accounts found for token ${mintAccount}.`);
    }
    return pubkey;
}

async function createNft(connection: Connection, wallet: Keypair): Promise<TokenWrapper> {

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
    console.log(`Minted token -- mintPubkey: ${mint}, value: ${accountInfo.amount}`);
    
    // And return the token address and the token account address.
    return {
        mintAddress: mint, 
        tokenAccount: associatedTokenAccount.address
    }
}

export {
    randomPayer,
    initializeKeypair,
    initializeKeypairAndFund,
    getWalletAddress,
    createNft,
}
