const bedrock = require("bedrock-protocol"); 

const client = bedrock.createClient({
  host: ip, 
  port: port, 
  username: userbot, 
  offline: true, 
  skipPing: true
});
