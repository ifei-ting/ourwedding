/* WeChat native location bridge. AppSecret never belongs in this file. */
(() => {
  const entryUrl = location.href.split('#')[0];
  let sdkPromise;
  function loadSDK() {
    if (window.wx && window.wx.config) return Promise.resolve(window.wx);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => {script.remove();reject(new Error('sdk_timeout'));}, 12000);
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
      script.onload = () => {clearTimeout(timeout);window.wx ? resolve(window.wx) : reject(new Error('sdk_missing'));};
      script.onerror = () => {clearTimeout(timeout);script.remove();reject(new Error('sdk_load_failed'));};
      document.head.appendChild(script);
    }).catch(error => {sdkPromise = null;throw error;});
    return sdkPromise;
  }
  window.createWeddingWechat = function ({point, name, address, onState}) {
    let state = 'idle', pending;
    function setState(value){state=value;if(onState)onState(value);}
    async function setup() {
      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(),15000);
      try {
        const [wx, response] = await Promise.all([loadSDK(), fetch('/api/wechat/signature', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({url:entryUrl}), signal:controller.signal, cache:'no-store'
        })]);
        if(!response.ok)throw new Error('signature_unavailable');
        const config = await response.json();
        if(!config.appId || !config.signature || !config.nonceStr || !Number.isFinite(config.timestamp))throw new Error('invalid_config');
        await new Promise((resolve,reject)=>{
          let settled=false;
          const timer=setTimeout(()=>finish(new Error('config_timeout')),10000);
          function finish(error){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();}
          wx.ready(()=>finish());
          wx.error(()=>finish(new Error('config_failed')));
          wx.config({...config,debug:false,jsApiList:['openLocation']});
        });
        setState('ready');
      } catch (_) {setState('failed');}
      finally {clearTimeout(timeout);pending=null;}
    }
    return {
      get state(){return state;},
      prepare(){if(state==='ready')return Promise.resolve();if(pending)return pending;setState('loading');pending=setup();return pending;},
      open(onFailure){
        if(state!=='ready')return false;
        try {
          window.wx.openLocation({latitude:point.lat,longitude:point.lng,name,address,scale:17,
            infoUrl:entryUrl,fail:()=>{setState('failed');onFailure();}});
          return true;
        } catch (_){setState('failed');onFailure();return false;}
      }
    };
  };
})();
