/* Koʻchasoz — hisobni alohida oqimda bajarish (sahifa qotmaydi) */
import { evaluate } from './kssim-plan.js?v=7';
self.onmessage=e=>{const {id,base}=e.data;try{const r=evaluate(base,p=>self.postMessage({id,p}));self.postMessage({id,done:r});}catch(err){self.postMessage({id,err:String(err&&err.stack||err)});}};
