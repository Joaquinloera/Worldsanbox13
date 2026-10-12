'use strict';
const http=require('node:http');
const {roster,validateRoster}=require('./core.cjs');
validateRoster();
const port=Number(process.env.PORT||8080);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
 if(req.method!=='GET')return send(405,{error:'Read-only API'});
 if(url.pathname==='/health')return send(200,{ok:true,capacity:30,configured:roster.agents.filter(a=>a.enabled).length,executorsBound:0});
 if(url.pathname==='/agents')return send(200,{capacity:30,agents:roster.agents});
 if(url.pathname==='/jobs')return send(200,{jobs:[],persistence:'not-configured'});
 const match=/^\/agents\/([a-zA-Z0-9-]+)$/.exec(url.pathname);
 if(match){const a=roster.agents.find(a=>a.id===match[1]);return a?send(200,a):send(404,{error:'Unknown agent'});}
 return send(404,{error:'Not found'});
});
if(require.main===module)server.listen(port,'0.0.0.0',()=>console.log('KINO agent API listening '+port));
module.exports={server};
