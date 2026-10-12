'use strict';
const PROVIDERS=Object.freeze(['cash-app-partner','paypal','stripe','visa-direct','treasury-prime','synctera']);
function validateFundingInstruction(i,env=process.env){
 if(!i||typeof i!=='object')throw Error('Missing instruction');
 if(!PROVIDERS.includes(i.provider))throw Error('Unsupported provider');
 if(!Number.isSafeInteger(i.amountCents)||i.amountCents<1||i.currency!=='USD')throw Error('Invalid USD amount');
 for(const k of ['sourceAccountId','recipientId','approvalReference','idempotencyKey'])if(typeof i[k]!=='string'||!/^[a-zA-Z0-9._:-]{8,160}$/.test(i[k]))throw Error('Invalid '+k);
 for(const [k,v] of Object.entries({KINO_LIVE_TRANSFERS:'enabled',KINO_PROVIDER_APPROVED:'true',KINO_SOURCE_FUNDED:'true',KINO_RECIPIENT_VERIFIED:'true',KINO_PAYMENT_AUTHORIZED:'true'}))if(env[k]!==v)throw Error('Funding gate closed: '+k);
 return Object.freeze({...i});
}
module.exports={PROVIDERS,validateFundingInstruction};
