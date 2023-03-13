# token-generator

The token generator is used to generate NFTs in localnet for use in the @soliage/foliage-detection repository. This is needed as a new localnet will not have retained NFTs from previous runs.
 
## Quickstart
Set tokens_to_create in main.ts to desired number of tokens.  
Create `./.keys/soliage_dev.json` private key.  

`npm install`  
`npm start`  

## Note
Runs for a long time. When finished, copy the tokens.json file to the foliage-detection repository
