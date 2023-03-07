import { LAMPORTS_PER_SOL, Keypair, Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Account, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from 'fs';

// anchor.setProvider(anchor.AnchorProvider.env());
// const connection = anchor.getProvider().connection;
const connection = new Connection(clusterApiUrl('devnet'));

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

export {
    randomPayer,
    initializeKeypair,
    getWalletAddress,
}
