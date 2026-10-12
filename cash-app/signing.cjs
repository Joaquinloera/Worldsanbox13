'use strict';
const crypto = require('node:crypto');
function signRequest({method, path, host, headers={}, body='', secret}) {
  if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) throw new Error('Invalid method');
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid path');
  if (!['sandbox.api.cash.app','api.cash.app'].includes(host)) throw new Error('Invalid host');
  if (typeof secret !== 'string' || !secret) throw new Error('Missing API secret');
  if (typeof body !== 'string') throw new Error('Body must be raw UTF-8 string');
  const normalized = Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),String(v).trim()]));
  if (normalized.host && normalized.host !== host) throw new Error('Host mismatch');
  normalized.host = host;
  const canonicalHeaders = ['accept','authorization','content-type','host'].filter(k=>Object.hasOwn(normalized,k)).map(k=>k+':'+normalized[k]+'\n').join('');
  const digest = crypto.createHash('sha256').update(Buffer.from(body,'utf8')).digest('hex');
  const canonical = [method,path,canonicalHeaders,digest].join('\n');
  return 'V1 '+crypto.createHmac('sha256',secret).update(canonical,'utf8').digest('hex');
}
module.exports={signRequest};
