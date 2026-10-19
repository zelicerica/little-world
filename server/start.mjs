import {createApp,readConfig} from './app.mjs';
const config=readConfig(),{server}=createApp({config});
server.listen(config.port,'127.0.0.1',()=>{console.log(`Little World: http://127.0.0.1:${config.port}`);console.log(config.enabled?'Hosted residents enabled; requests begin only when you opt in using the page.':'Offline mode. Configure .env.local to enable hosted residents.');});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'That port is already in use. Close the other server or change PORT.':'Could not start the local server.');process.exitCode=1;});
