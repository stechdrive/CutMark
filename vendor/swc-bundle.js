(()=>{var Lo=Object.create;var we=Object.defineProperty;var Ro=Object.getOwnPropertyDescriptor;var No=Object.getOwnPropertyNames;var Mo=Object.getPrototypeOf,Oo=Object.prototype.hasOwnProperty;var Ho=(r,t)=>()=>(t||r((t={exports:{}}).exports,t),t.exports);var Do=(r,t,e,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of No(t))!Oo.call(r,s)&&s!==e&&we(r,s,{get:()=>t[s],enumerable:!(o=Ro(t,s))||o.enumerable});return r};var jo=(r,t,e)=>(e=r!=null?Lo(Mo(r)):{},Do(t||!r||!r.__esModule?we(e,"default",{value:r,enumerable:!0}):e,r));var vo=Ho((fe,mo)=>{(function(r,t){typeof fe=="object"&&typeof mo!="undefined"?t():typeof define=="function"&&define.amd?define(t):t()})(fe,function(){"use strict";function r(e){var o=!0,s=!1,i=null,n={text:!0,search:!0,url:!0,tel:!0,email:!0,password:!0,number:!0,date:!0,month:!0,week:!0,time:!0,datetime:!0,"datetime-local":!0};function d(m){return!!(m&&m!==document&&m.nodeName!=="HTML"&&m.nodeName!=="BODY"&&"classList"in m&&"contains"in m.classList)}function c(m){var zo=m.type,Ae=m.tagName;return!!(Ae==="INPUT"&&n[zo]&&!m.readOnly||Ae==="TEXTAREA"&&!m.readOnly||m.isContentEditable)}function a(m){m.classList.contains("focus-visible")||(m.classList.add("focus-visible"),m.setAttribute("data-focus-visible-added",""))}function l(m){m.hasAttribute("data-focus-visible-added")&&(m.classList.remove("focus-visible"),m.removeAttribute("data-focus-visible-added"))}function u(m){m.metaKey||m.altKey||m.ctrlKey||(d(e.activeElement)&&a(e.activeElement),o=!0)}function h(m){o=!1}function p(m){d(m.target)&&(o||c(m.target))&&a(m.target)}function v(m){d(m.target)&&(m.target.classList.contains("focus-visible")||m.target.hasAttribute("data-focus-visible-added"))&&(s=!0,window.clearTimeout(i),i=window.setTimeout(function(){s=!1},100),l(m.target))}function f(m){document.visibilityState==="hidden"&&(s&&(o=!0),w())}function w(){document.addEventListener("mousemove",g),document.addEventListener("mousedown",g),document.addEventListener("mouseup",g),document.addEventListener("pointermove",g),document.addEventListener("pointerdown",g),document.addEventListener("pointerup",g),document.addEventListener("touchmove",g),document.addEventListener("touchstart",g),document.addEventListener("touchend",g)}function et(){document.removeEventListener("mousemove",g),document.removeEventListener("mousedown",g),document.removeEventListener("mouseup",g),document.removeEventListener("pointermove",g),document.removeEventListener("pointerdown",g),document.removeEventListener("pointerup",g),document.removeEventListener("touchmove",g),document.removeEventListener("touchstart",g),document.removeEventListener("touchend",g)}function g(m){m.target.nodeName&&m.target.nodeName.toLowerCase()==="html"||(o=!1,et())}document.addEventListener("keydown",u,!0),document.addEventListener("mousedown",h,!0),document.addEventListener("pointerdown",h,!0),document.addEventListener("touchstart",h,!0),document.addEventListener("visibilitychange",f,!0),w(),e.addEventListener("focus",p,!0),e.addEventListener("blur",v,!0),e.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&e.host?e.host.setAttribute("data-js-focus-visible",""):e.nodeType===Node.DOCUMENT_NODE&&(document.documentElement.classList.add("js-focus-visible"),document.documentElement.setAttribute("data-js-focus-visible",""))}if(typeof window!="undefined"&&typeof document!="undefined"){window.applyFocusVisiblePolyfill=r;var t;try{t=new CustomEvent("focus-visible-polyfill-ready")}catch{t=document.createEvent("CustomEvent"),t.initCustomEvent("focus-visible-polyfill-ready",!1,!1,{})}window.dispatchEvent(t)}typeof document!="undefined"&&r(document)})});var pt=window,vt=pt.ShadowRoot&&(pt.ShadyCSS===void 0||pt.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Ce=Symbol(),Ee=new WeakMap,mt=class{constructor(t,e,o){if(this._$cssResult$=!0,o!==Ce)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(vt&&t===void 0){let o=e!==void 0&&e.length===1;o&&(t=Ee.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),o&&Ee.set(e,t))}return t}toString(){return this.cssText}},Se=r=>new mt(typeof r=="string"?r:r+"",void 0,Ce);var Ft=(r,t)=>{vt?r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet):t.forEach(e=>{let o=document.createElement("style"),s=pt.litNonce;s!==void 0&&o.setAttribute("nonce",s),o.textContent=e.cssText,r.appendChild(o)})},ft=vt?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(let o of t.cssRules)e+=o.cssText;return Se(e)})(r):r;var Bt,gt=window,Ie=gt.trustedTypes,Fo=Ie?Ie.emptyScript:"",ke=gt.reactiveElementPolyfillSupport,qt={toAttribute(r,t){switch(t){case Boolean:r=r?Fo:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},Ue=(r,t)=>t!==r&&(t==t||r==r),Vt={attribute:!0,type:String,converter:qt,reflect:!1,hasChanged:Ue},Kt="finalized",R=class extends HTMLElement{constructor(){super(),this._$Ei=new Map,this.isUpdatePending=!1,this.hasUpdated=!1,this._$El=null,this._$Eu()}static addInitializer(t){var e;this.finalize(),((e=this.h)!==null&&e!==void 0?e:this.h=[]).push(t)}static get observedAttributes(){this.finalize();let t=[];return this.elementProperties.forEach((e,o)=>{let s=this._$Ep(o,e);s!==void 0&&(this._$Ev.set(s,o),t.push(s))}),t}static createProperty(t,e=Vt){if(e.state&&(e.attribute=!1),this.finalize(),this.elementProperties.set(t,e),!e.noAccessor&&!this.prototype.hasOwnProperty(t)){let o=typeof t=="symbol"?Symbol():"__"+t,s=this.getPropertyDescriptor(t,o,e);s!==void 0&&Object.defineProperty(this.prototype,t,s)}}static getPropertyDescriptor(t,e,o){return{get(){return this[e]},set(s){let i=this[t];this[e]=s,this.requestUpdate(t,i,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)||Vt}static finalize(){if(this.hasOwnProperty(Kt))return!1;this[Kt]=!0;let t=Object.getPrototypeOf(this);if(t.finalize(),t.h!==void 0&&(this.h=[...t.h]),this.elementProperties=new Map(t.elementProperties),this._$Ev=new Map,this.hasOwnProperty("properties")){let e=this.properties,o=[...Object.getOwnPropertyNames(e),...Object.getOwnPropertySymbols(e)];for(let s of o)this.createProperty(s,e[s])}return this.elementStyles=this.finalizeStyles(this.styles),!0}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let o=new Set(t.flat(1/0).reverse());for(let s of o)e.unshift(ft(s))}else t!==void 0&&e.push(ft(t));return e}static _$Ep(t,e){let o=e.attribute;return o===!1?void 0:typeof o=="string"?o:typeof t=="string"?t.toLowerCase():void 0}_$Eu(){var t;this._$E_=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$Eg(),this.requestUpdate(),(t=this.constructor.h)===null||t===void 0||t.forEach(e=>e(this))}addController(t){var e,o;((e=this._$ES)!==null&&e!==void 0?e:this._$ES=[]).push(t),this.renderRoot!==void 0&&this.isConnected&&((o=t.hostConnected)===null||o===void 0||o.call(t))}removeController(t){var e;(e=this._$ES)===null||e===void 0||e.splice(this._$ES.indexOf(t)>>>0,1)}_$Eg(){this.constructor.elementProperties.forEach((t,e)=>{this.hasOwnProperty(e)&&(this._$Ei.set(e,this[e]),delete this[e])})}createRenderRoot(){var t;let e=(t=this.shadowRoot)!==null&&t!==void 0?t:this.attachShadow(this.constructor.shadowRootOptions);return Ft(e,this.constructor.elementStyles),e}connectedCallback(){var t;this.renderRoot===void 0&&(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$ES)===null||t===void 0||t.forEach(e=>{var o;return(o=e.hostConnected)===null||o===void 0?void 0:o.call(e)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$ES)===null||t===void 0||t.forEach(e=>{var o;return(o=e.hostDisconnected)===null||o===void 0?void 0:o.call(e)})}attributeChangedCallback(t,e,o){this._$AK(t,o)}_$EO(t,e,o=Vt){var s;let i=this.constructor._$Ep(t,o);if(i!==void 0&&o.reflect===!0){let n=(((s=o.converter)===null||s===void 0?void 0:s.toAttribute)!==void 0?o.converter:qt).toAttribute(e,o.type);this._$El=t,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$El=null}}_$AK(t,e){var o;let s=this.constructor,i=s._$Ev.get(t);if(i!==void 0&&this._$El!==i){let n=s.getPropertyOptions(i),d=typeof n.converter=="function"?{fromAttribute:n.converter}:((o=n.converter)===null||o===void 0?void 0:o.fromAttribute)!==void 0?n.converter:qt;this._$El=i,this[i]=d.fromAttribute(e,n.type),this._$El=null}}requestUpdate(t,e,o){let s=!0;t!==void 0&&(((o=o||this.constructor.getPropertyOptions(t)).hasChanged||Ue)(this[t],e)?(this._$AL.has(t)||this._$AL.set(t,e),o.reflect===!0&&this._$El!==t&&(this._$EC===void 0&&(this._$EC=new Map),this._$EC.set(t,o))):s=!1),!this.isUpdatePending&&s&&(this._$E_=this._$Ej())}async _$Ej(){this.isUpdatePending=!0;try{await this._$E_}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var t;if(!this.isUpdatePending)return;this.hasUpdated,this._$Ei&&(this._$Ei.forEach((s,i)=>this[i]=s),this._$Ei=void 0);let e=!1,o=this._$AL;try{e=this.shouldUpdate(o),e?(this.willUpdate(o),(t=this._$ES)===null||t===void 0||t.forEach(s=>{var i;return(i=s.hostUpdate)===null||i===void 0?void 0:i.call(s)}),this.update(o)):this._$Ek()}catch(s){throw e=!1,this._$Ek(),s}e&&this._$AE(o)}willUpdate(t){}_$AE(t){var e;(e=this._$ES)===null||e===void 0||e.forEach(o=>{var s;return(s=o.hostUpdated)===null||s===void 0?void 0:s.call(o)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$Ek(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$E_}shouldUpdate(t){return!0}update(t){this._$EC!==void 0&&(this._$EC.forEach((e,o)=>this._$EO(o,this[o],e)),this._$EC=void 0),this._$Ek()}updated(t){}firstUpdated(t){}};R[Kt]=!0,R.elementProperties=new Map,R.elementStyles=[],R.shadowRootOptions={mode:"open"},ke==null||ke({ReactiveElement:R}),((Bt=gt.reactiveElementVersions)!==null&&Bt!==void 0?Bt:gt.reactiveElementVersions=[]).push("1.6.3");var Wt,bt=window,G=bt.trustedTypes,Pe=G?G.createPolicy("lit-html",{createHTML:r=>r}):void 0,yt="$lit$",S=`lit$${(Math.random()+"").slice(9)}$`,Yt="?"+S,Bo=`<${Yt}>`,O=document,_t=()=>O.createComment(""),rt=r=>r===null||typeof r!="object"&&typeof r!="function",Oe=Array.isArray,He=r=>Oe(r)||typeof(r==null?void 0:r[Symbol.iterator])=="function",Gt=`[ 	
\f\r]`,ot=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Te=/-->/g,ze=/>/g,N=RegExp(`>|${Gt}(?:([^\\s"'>=/]+)(${Gt}*=${Gt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Le=/'/g,Re=/"/g,De=/^(?:script|style|textarea|title)$/i,je=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),Dr=je(1),jr=je(2),y=Symbol.for("lit-noChange"),b=Symbol.for("lit-nothing"),Ne=new WeakMap,M=O.createTreeWalker(O,129,null,!1);function Fe(r,t){if(!Array.isArray(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return Pe!==void 0?Pe.createHTML(t):t}var Be=(r,t)=>{let e=r.length-1,o=[],s,i=t===2?"<svg>":"",n=ot;for(let d=0;d<e;d++){let c=r[d],a,l,u=-1,h=0;for(;h<c.length&&(n.lastIndex=h,l=n.exec(c),l!==null);)h=n.lastIndex,n===ot?l[1]==="!--"?n=Te:l[1]!==void 0?n=ze:l[2]!==void 0?(De.test(l[2])&&(s=RegExp("</"+l[2],"g")),n=N):l[3]!==void 0&&(n=N):n===N?l[0]===">"?(n=s!=null?s:ot,u=-1):l[1]===void 0?u=-2:(u=n.lastIndex-l[2].length,a=l[1],n=l[3]===void 0?N:l[3]==='"'?Re:Le):n===Re||n===Le?n=N:n===Te||n===ze?n=ot:(n=N,s=void 0);let p=n===N&&r[d+1].startsWith("/>")?" ":"";i+=n===ot?c+Bo:u>=0?(o.push(a),c.slice(0,u)+yt+c.slice(u)+S+p):c+S+(u===-2?(o.push(void 0),d):p)}return[Fe(r,i+(r[e]||"<?>")+(t===2?"</svg>":"")),o]},st=class r{constructor({strings:t,_$litType$:e},o){let s;this.parts=[];let i=0,n=0,d=t.length-1,c=this.parts,[a,l]=Be(t,e);if(this.el=r.createElement(a,o),M.currentNode=this.el.content,e===2){let u=this.el.content,h=u.firstChild;h.remove(),u.append(...h.childNodes)}for(;(s=M.nextNode())!==null&&c.length<d;){if(s.nodeType===1){if(s.hasAttributes()){let u=[];for(let h of s.getAttributeNames())if(h.endsWith(yt)||h.startsWith(S)){let p=l[n++];if(u.push(h),p!==void 0){let v=s.getAttribute(p.toLowerCase()+yt).split(S),f=/([.?@])?(.*)/.exec(p);c.push({type:1,index:i,name:f[2],strings:v,ctor:f[1]==="."?xt:f[1]==="?"?At:f[1]==="@"?wt:D})}else c.push({type:6,index:i})}for(let h of u)s.removeAttribute(h)}if(De.test(s.tagName)){let u=s.textContent.split(S),h=u.length-1;if(h>0){s.textContent=G?G.emptyScript:"";for(let p=0;p<h;p++)s.append(u[p],_t()),M.nextNode(),c.push({type:2,index:++i});s.append(u[h],_t())}}}else if(s.nodeType===8)if(s.data===Yt)c.push({type:2,index:i});else{let u=-1;for(;(u=s.data.indexOf(S,u+1))!==-1;)c.push({type:7,index:i}),u+=S.length-1}i++}}static createElement(t,e){let o=O.createElement("template");return o.innerHTML=t,o}};function H(r,t,e=r,o){var s,i,n,d;if(t===y)return t;let c=o!==void 0?(s=e._$Co)===null||s===void 0?void 0:s[o]:e._$Cl,a=rt(t)?void 0:t._$litDirective$;return(c==null?void 0:c.constructor)!==a&&((i=c==null?void 0:c._$AO)===null||i===void 0||i.call(c,!1),a===void 0?c=void 0:(c=new a(r),c._$AT(r,e,o)),o!==void 0?((n=(d=e)._$Co)!==null&&n!==void 0?n:d._$Co=[])[o]=c:e._$Cl=c),c!==void 0&&(t=H(r,c._$AS(r,t.values),c,o)),t}var $t=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){var e;let{el:{content:o},parts:s}=this._$AD,i=((e=t==null?void 0:t.creationScope)!==null&&e!==void 0?e:O).importNode(o,!0);M.currentNode=i;let n=M.nextNode(),d=0,c=0,a=s[0];for(;a!==void 0;){if(d===a.index){let l;a.type===2?l=new it(n,n.nextSibling,this,t):a.type===1?l=new a.ctor(n,a.name,a.strings,this,t):a.type===6&&(l=new Et(n,this,t)),this._$AV.push(l),a=s[++c]}d!==(a==null?void 0:a.index)&&(n=M.nextNode(),d++)}return M.currentNode=O,i}v(t){let e=0;for(let o of this._$AV)o!==void 0&&(o.strings!==void 0?(o._$AI(t,o,e),e+=o.strings.length-2):o._$AI(t[e])),e++}},it=class r{constructor(t,e,o,s){var i;this.type=2,this._$AH=b,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=o,this.options=s,this._$Cp=(i=s==null?void 0:s.isConnected)===null||i===void 0||i}get _$AU(){var t,e;return(e=(t=this._$AM)===null||t===void 0?void 0:t._$AU)!==null&&e!==void 0?e:this._$Cp}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=H(this,t,e),rt(t)?t===b||t==null||t===""?(this._$AH!==b&&this._$AR(),this._$AH=b):t!==this._$AH&&t!==y&&this._(t):t._$litType$!==void 0?this.g(t):t.nodeType!==void 0?this.$(t):He(t)?this.T(t):this._(t)}k(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}$(t){this._$AH!==t&&(this._$AR(),this._$AH=this.k(t))}_(t){this._$AH!==b&&rt(this._$AH)?this._$AA.nextSibling.data=t:this.$(O.createTextNode(t)),this._$AH=t}g(t){var e;let{values:o,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=st.createElement(Fe(s.h,s.h[0]),this.options)),s);if(((e=this._$AH)===null||e===void 0?void 0:e._$AD)===i)this._$AH.v(o);else{let n=new $t(i,this),d=n.u(this.options);n.v(o),this.$(d),this._$AH=n}}_$AC(t){let e=Ne.get(t.strings);return e===void 0&&Ne.set(t.strings,e=new st(t)),e}T(t){Oe(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,o,s=0;for(let i of t)s===e.length?e.push(o=new r(this.k(_t()),this.k(_t()),this,this.options)):o=e[s],o._$AI(i),s++;s<e.length&&(this._$AR(o&&o._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){var o;for((o=this._$AP)===null||o===void 0||o.call(this,!1,!0,e);t&&t!==this._$AB;){let s=t.nextSibling;t.remove(),t=s}}setConnected(t){var e;this._$AM===void 0&&(this._$Cp=t,(e=this._$AP)===null||e===void 0||e.call(this,t))}},D=class{constructor(t,e,o,s,i){this.type=1,this._$AH=b,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=i,o.length>2||o[0]!==""||o[1]!==""?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=b}get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}_$AI(t,e=this,o,s){let i=this.strings,n=!1;if(i===void 0)t=H(this,t,e,0),n=!rt(t)||t!==this._$AH&&t!==y,n&&(this._$AH=t);else{let d=t,c,a;for(t=i[0],c=0;c<i.length-1;c++)a=H(this,d[o+c],e,c),a===y&&(a=this._$AH[c]),n||(n=!rt(a)||a!==this._$AH[c]),a===b?t=b:t!==b&&(t+=(a!=null?a:"")+i[c+1]),this._$AH[c]=a}n&&!s&&this.j(t)}j(t){t===b?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t!=null?t:"")}},xt=class extends D{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===b?void 0:t}},Vo=G?G.emptyScript:"",At=class extends D{constructor(){super(...arguments),this.type=4}j(t){t&&t!==b?this.element.setAttribute(this.name,Vo):this.element.removeAttribute(this.name)}},wt=class extends D{constructor(t,e,o,s,i){super(t,e,o,s,i),this.type=5}_$AI(t,e=this){var o;if((t=(o=H(this,t,e,0))!==null&&o!==void 0?o:b)===y)return;let s=this._$AH,i=t===b&&s!==b||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==b&&(s===b||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var e,o;typeof this._$AH=="function"?this._$AH.call((o=(e=this.options)===null||e===void 0?void 0:e.host)!==null&&o!==void 0?o:this.element,t):this._$AH.handleEvent(t)}},Et=class{constructor(t,e,o){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(t){H(this,t)}},Ve={O:yt,P:S,A:Yt,C:1,M:Be,L:$t,R:He,D:H,I:it,V:D,H:At,N:wt,U:xt,F:Et},Me=bt.litHtmlPolyfillSupport;Me==null||Me(st,it),((Wt=bt.litHtmlVersions)!==null&&Wt!==void 0?Wt:bt.litHtmlVersions=[]).push("2.8.0");var Ct=window,St=Ct.ShadowRoot&&(Ct.ShadyCSS===void 0||Ct.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Zt=Symbol(),qe=new WeakMap,nt=class{constructor(t,e,o){if(this._$cssResult$=!0,o!==Zt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(St&&t===void 0){let o=e!==void 0&&e.length===1;o&&(t=qe.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),o&&qe.set(e,t))}return t}toString(){return this.cssText}},Ke=r=>new nt(typeof r=="string"?r:r+"",void 0,Zt),I=(r,...t)=>{let e=r.length===1?r[0]:t.reduce((o,s,i)=>o+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+r[i+1],r[0]);return new nt(e,r,Zt)},Jt=(r,t)=>{St?r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet):t.forEach(e=>{let o=document.createElement("style"),s=Ct.litNonce;s!==void 0&&o.setAttribute("nonce",s),o.textContent=e.cssText,r.appendChild(o)})},It=St?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(let o of t.cssRules)e+=o.cssText;return Ke(e)})(r):r;var Qt,kt=window,We=kt.trustedTypes,qo=We?We.emptyScript:"",Ge=kt.reactiveElementPolyfillSupport,te={toAttribute(r,t){switch(t){case Boolean:r=r?qo:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},Ye=(r,t)=>t!==r&&(t==t||r==r),Xt={attribute:!0,type:String,converter:te,reflect:!1,hasChanged:Ye},ee="finalized",k=class extends HTMLElement{constructor(){super(),this._$Ei=new Map,this.isUpdatePending=!1,this.hasUpdated=!1,this._$El=null,this._$Eu()}static addInitializer(t){var e;this.finalize(),((e=this.h)!==null&&e!==void 0?e:this.h=[]).push(t)}static get observedAttributes(){this.finalize();let t=[];return this.elementProperties.forEach((e,o)=>{let s=this._$Ep(o,e);s!==void 0&&(this._$Ev.set(s,o),t.push(s))}),t}static createProperty(t,e=Xt){if(e.state&&(e.attribute=!1),this.finalize(),this.elementProperties.set(t,e),!e.noAccessor&&!this.prototype.hasOwnProperty(t)){let o=typeof t=="symbol"?Symbol():"__"+t,s=this.getPropertyDescriptor(t,o,e);s!==void 0&&Object.defineProperty(this.prototype,t,s)}}static getPropertyDescriptor(t,e,o){return{get(){return this[e]},set(s){let i=this[t];this[e]=s,this.requestUpdate(t,i,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)||Xt}static finalize(){if(this.hasOwnProperty(ee))return!1;this[ee]=!0;let t=Object.getPrototypeOf(this);if(t.finalize(),t.h!==void 0&&(this.h=[...t.h]),this.elementProperties=new Map(t.elementProperties),this._$Ev=new Map,this.hasOwnProperty("properties")){let e=this.properties,o=[...Object.getOwnPropertyNames(e),...Object.getOwnPropertySymbols(e)];for(let s of o)this.createProperty(s,e[s])}return this.elementStyles=this.finalizeStyles(this.styles),!0}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let o=new Set(t.flat(1/0).reverse());for(let s of o)e.unshift(It(s))}else t!==void 0&&e.push(It(t));return e}static _$Ep(t,e){let o=e.attribute;return o===!1?void 0:typeof o=="string"?o:typeof t=="string"?t.toLowerCase():void 0}_$Eu(){var t;this._$E_=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$Eg(),this.requestUpdate(),(t=this.constructor.h)===null||t===void 0||t.forEach(e=>e(this))}addController(t){var e,o;((e=this._$ES)!==null&&e!==void 0?e:this._$ES=[]).push(t),this.renderRoot!==void 0&&this.isConnected&&((o=t.hostConnected)===null||o===void 0||o.call(t))}removeController(t){var e;(e=this._$ES)===null||e===void 0||e.splice(this._$ES.indexOf(t)>>>0,1)}_$Eg(){this.constructor.elementProperties.forEach((t,e)=>{this.hasOwnProperty(e)&&(this._$Ei.set(e,this[e]),delete this[e])})}createRenderRoot(){var t;let e=(t=this.shadowRoot)!==null&&t!==void 0?t:this.attachShadow(this.constructor.shadowRootOptions);return Jt(e,this.constructor.elementStyles),e}connectedCallback(){var t;this.renderRoot===void 0&&(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$ES)===null||t===void 0||t.forEach(e=>{var o;return(o=e.hostConnected)===null||o===void 0?void 0:o.call(e)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$ES)===null||t===void 0||t.forEach(e=>{var o;return(o=e.hostDisconnected)===null||o===void 0?void 0:o.call(e)})}attributeChangedCallback(t,e,o){this._$AK(t,o)}_$EO(t,e,o=Xt){var s;let i=this.constructor._$Ep(t,o);if(i!==void 0&&o.reflect===!0){let n=(((s=o.converter)===null||s===void 0?void 0:s.toAttribute)!==void 0?o.converter:te).toAttribute(e,o.type);this._$El=t,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$El=null}}_$AK(t,e){var o;let s=this.constructor,i=s._$Ev.get(t);if(i!==void 0&&this._$El!==i){let n=s.getPropertyOptions(i),d=typeof n.converter=="function"?{fromAttribute:n.converter}:((o=n.converter)===null||o===void 0?void 0:o.fromAttribute)!==void 0?n.converter:te;this._$El=i,this[i]=d.fromAttribute(e,n.type),this._$El=null}}requestUpdate(t,e,o){let s=!0;t!==void 0&&(((o=o||this.constructor.getPropertyOptions(t)).hasChanged||Ye)(this[t],e)?(this._$AL.has(t)||this._$AL.set(t,e),o.reflect===!0&&this._$El!==t&&(this._$EC===void 0&&(this._$EC=new Map),this._$EC.set(t,o))):s=!1),!this.isUpdatePending&&s&&(this._$E_=this._$Ej())}async _$Ej(){this.isUpdatePending=!0;try{await this._$E_}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var t;if(!this.isUpdatePending)return;this.hasUpdated,this._$Ei&&(this._$Ei.forEach((s,i)=>this[i]=s),this._$Ei=void 0);let e=!1,o=this._$AL;try{e=this.shouldUpdate(o),e?(this.willUpdate(o),(t=this._$ES)===null||t===void 0||t.forEach(s=>{var i;return(i=s.hostUpdate)===null||i===void 0?void 0:i.call(s)}),this.update(o)):this._$Ek()}catch(s){throw e=!1,this._$Ek(),s}e&&this._$AE(o)}willUpdate(t){}_$AE(t){var e;(e=this._$ES)===null||e===void 0||e.forEach(o=>{var s;return(s=o.hostUpdated)===null||s===void 0?void 0:s.call(o)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$Ek(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$E_}shouldUpdate(t){return!0}update(t){this._$EC!==void 0&&(this._$EC.forEach((e,o)=>this._$EO(o,this[o],e)),this._$EC=void 0),this._$Ek()}updated(t){}firstUpdated(t){}};k[ee]=!0,k.elementProperties=new Map,k.elementStyles=[],k.shadowRootOptions={mode:"open"},Ge==null||Ge({ReactiveElement:k}),((Qt=kt.reactiveElementVersions)!==null&&Qt!==void 0?Qt:kt.reactiveElementVersions=[]).push("1.6.3");var oe,Ut=window,Y=Ut.trustedTypes,Ze=Y?Y.createPolicy("lit-html",{createHTML:r=>r}):void 0,se="$lit$",U=`lit$${(Math.random()+"").slice(9)}$`,ro="?"+U,Ko=`<${ro}>`,B=document,at=()=>B.createComment(""),dt=r=>r===null||typeof r!="object"&&typeof r!="function",so=Array.isArray,Wo=r=>so(r)||typeof(r==null?void 0:r[Symbol.iterator])=="function",re=`[ 	
\f\r]`,ct=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Je=/-->/g,Qe=/>/g,j=RegExp(`>|${re}(?:([^\\s"'>=/]+)(${re}*=${re}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Xe=/'/g,to=/"/g,io=/^(?:script|style|textarea|title)$/i,no=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),E=no(1),Wr=no(2),V=Symbol.for("lit-noChange"),_=Symbol.for("lit-nothing"),eo=new WeakMap,F=B.createTreeWalker(B,129,null,!1);function co(r,t){if(!Array.isArray(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ze!==void 0?Ze.createHTML(t):t}var Go=(r,t)=>{let e=r.length-1,o=[],s,i=t===2?"<svg>":"",n=ct;for(let d=0;d<e;d++){let c=r[d],a,l,u=-1,h=0;for(;h<c.length&&(n.lastIndex=h,l=n.exec(c),l!==null);)h=n.lastIndex,n===ct?l[1]==="!--"?n=Je:l[1]!==void 0?n=Qe:l[2]!==void 0?(io.test(l[2])&&(s=RegExp("</"+l[2],"g")),n=j):l[3]!==void 0&&(n=j):n===j?l[0]===">"?(n=s!=null?s:ct,u=-1):l[1]===void 0?u=-2:(u=n.lastIndex-l[2].length,a=l[1],n=l[3]===void 0?j:l[3]==='"'?to:Xe):n===to||n===Xe?n=j:n===Je||n===Qe?n=ct:(n=j,s=void 0);let p=n===j&&r[d+1].startsWith("/>")?" ":"";i+=n===ct?c+Ko:u>=0?(o.push(a),c.slice(0,u)+se+c.slice(u)+U+p):c+U+(u===-2?(o.push(void 0),d):p)}return[co(r,i+(r[e]||"<?>")+(t===2?"</svg>":"")),o]},lt=class r{constructor({strings:t,_$litType$:e},o){let s;this.parts=[];let i=0,n=0,d=t.length-1,c=this.parts,[a,l]=Go(t,e);if(this.el=r.createElement(a,o),F.currentNode=this.el.content,e===2){let u=this.el.content,h=u.firstChild;h.remove(),u.append(...h.childNodes)}for(;(s=F.nextNode())!==null&&c.length<d;){if(s.nodeType===1){if(s.hasAttributes()){let u=[];for(let h of s.getAttributeNames())if(h.endsWith(se)||h.startsWith(U)){let p=l[n++];if(u.push(h),p!==void 0){let v=s.getAttribute(p.toLowerCase()+se).split(U),f=/([.?@])?(.*)/.exec(p);c.push({type:1,index:i,name:f[2],strings:v,ctor:f[1]==="."?ne:f[1]==="?"?ce:f[1]==="@"?ae:J})}else c.push({type:6,index:i})}for(let h of u)s.removeAttribute(h)}if(io.test(s.tagName)){let u=s.textContent.split(U),h=u.length-1;if(h>0){s.textContent=Y?Y.emptyScript:"";for(let p=0;p<h;p++)s.append(u[p],at()),F.nextNode(),c.push({type:2,index:++i});s.append(u[h],at())}}}else if(s.nodeType===8)if(s.data===ro)c.push({type:2,index:i});else{let u=-1;for(;(u=s.data.indexOf(U,u+1))!==-1;)c.push({type:7,index:i}),u+=U.length-1}i++}}static createElement(t,e){let o=B.createElement("template");return o.innerHTML=t,o}};function Z(r,t,e=r,o){var s,i,n,d;if(t===V)return t;let c=o!==void 0?(s=e._$Co)===null||s===void 0?void 0:s[o]:e._$Cl,a=dt(t)?void 0:t._$litDirective$;return(c==null?void 0:c.constructor)!==a&&((i=c==null?void 0:c._$AO)===null||i===void 0||i.call(c,!1),a===void 0?c=void 0:(c=new a(r),c._$AT(r,e,o)),o!==void 0?((n=(d=e)._$Co)!==null&&n!==void 0?n:d._$Co=[])[o]=c:e._$Cl=c),c!==void 0&&(t=Z(r,c._$AS(r,t.values),c,o)),t}var ie=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){var e;let{el:{content:o},parts:s}=this._$AD,i=((e=t==null?void 0:t.creationScope)!==null&&e!==void 0?e:B).importNode(o,!0);F.currentNode=i;let n=F.nextNode(),d=0,c=0,a=s[0];for(;a!==void 0;){if(d===a.index){let l;a.type===2?l=new ht(n,n.nextSibling,this,t):a.type===1?l=new a.ctor(n,a.name,a.strings,this,t):a.type===6&&(l=new de(n,this,t)),this._$AV.push(l),a=s[++c]}d!==(a==null?void 0:a.index)&&(n=F.nextNode(),d++)}return F.currentNode=B,i}v(t){let e=0;for(let o of this._$AV)o!==void 0&&(o.strings!==void 0?(o._$AI(t,o,e),e+=o.strings.length-2):o._$AI(t[e])),e++}},ht=class r{constructor(t,e,o,s){var i;this.type=2,this._$AH=_,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=o,this.options=s,this._$Cp=(i=s==null?void 0:s.isConnected)===null||i===void 0||i}get _$AU(){var t,e;return(e=(t=this._$AM)===null||t===void 0?void 0:t._$AU)!==null&&e!==void 0?e:this._$Cp}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Z(this,t,e),dt(t)?t===_||t==null||t===""?(this._$AH!==_&&this._$AR(),this._$AH=_):t!==this._$AH&&t!==V&&this._(t):t._$litType$!==void 0?this.g(t):t.nodeType!==void 0?this.$(t):Wo(t)?this.T(t):this._(t)}k(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}$(t){this._$AH!==t&&(this._$AR(),this._$AH=this.k(t))}_(t){this._$AH!==_&&dt(this._$AH)?this._$AA.nextSibling.data=t:this.$(B.createTextNode(t)),this._$AH=t}g(t){var e;let{values:o,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=lt.createElement(co(s.h,s.h[0]),this.options)),s);if(((e=this._$AH)===null||e===void 0?void 0:e._$AD)===i)this._$AH.v(o);else{let n=new ie(i,this),d=n.u(this.options);n.v(o),this.$(d),this._$AH=n}}_$AC(t){let e=eo.get(t.strings);return e===void 0&&eo.set(t.strings,e=new lt(t)),e}T(t){so(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,o,s=0;for(let i of t)s===e.length?e.push(o=new r(this.k(at()),this.k(at()),this,this.options)):o=e[s],o._$AI(i),s++;s<e.length&&(this._$AR(o&&o._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){var o;for((o=this._$AP)===null||o===void 0||o.call(this,!1,!0,e);t&&t!==this._$AB;){let s=t.nextSibling;t.remove(),t=s}}setConnected(t){var e;this._$AM===void 0&&(this._$Cp=t,(e=this._$AP)===null||e===void 0||e.call(this,t))}},J=class{constructor(t,e,o,s,i){this.type=1,this._$AH=_,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=i,o.length>2||o[0]!==""||o[1]!==""?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=_}get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}_$AI(t,e=this,o,s){let i=this.strings,n=!1;if(i===void 0)t=Z(this,t,e,0),n=!dt(t)||t!==this._$AH&&t!==V,n&&(this._$AH=t);else{let d=t,c,a;for(t=i[0],c=0;c<i.length-1;c++)a=Z(this,d[o+c],e,c),a===V&&(a=this._$AH[c]),n||(n=!dt(a)||a!==this._$AH[c]),a===_?t=_:t!==_&&(t+=(a!=null?a:"")+i[c+1]),this._$AH[c]=a}n&&!s&&this.j(t)}j(t){t===_?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t!=null?t:"")}},ne=class extends J{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===_?void 0:t}},Yo=Y?Y.emptyScript:"",ce=class extends J{constructor(){super(...arguments),this.type=4}j(t){t&&t!==_?this.element.setAttribute(this.name,Yo):this.element.removeAttribute(this.name)}},ae=class extends J{constructor(t,e,o,s,i){super(t,e,o,s,i),this.type=5}_$AI(t,e=this){var o;if((t=(o=Z(this,t,e,0))!==null&&o!==void 0?o:_)===V)return;let s=this._$AH,i=t===_&&s!==_||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==_&&(s===_||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var e,o;typeof this._$AH=="function"?this._$AH.call((o=(e=this.options)===null||e===void 0?void 0:e.host)!==null&&o!==void 0?o:this.element,t):this._$AH.handleEvent(t)}},de=class{constructor(t,e,o){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(t){Z(this,t)}};var oo=Ut.litHtmlPolyfillSupport;oo==null||oo(lt,ht),((oe=Ut.litHtmlVersions)!==null&&oe!==void 0?oe:Ut.litHtmlVersions=[]).push("2.8.0");var ao=(r,t,e)=>{var o,s;let i=(o=e==null?void 0:e.renderBefore)!==null&&o!==void 0?o:t,n=i._$litPart$;if(n===void 0){let d=(s=e==null?void 0:e.renderBefore)!==null&&s!==void 0?s:null;i._$litPart$=n=new ht(t.insertBefore(at(),d),d,void 0,e!=null?e:{})}return n._$AI(r),n};var le,he;var P=class extends k{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t,e;let o=super.createRenderRoot();return(t=(e=this.renderOptions).renderBefore)!==null&&t!==void 0||(e.renderBefore=o.firstChild),o}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=ao(e,this.renderRoot,this.renderOptions)}connectedCallback(){var t;super.connectedCallback(),(t=this._$Do)===null||t===void 0||t.setConnected(!0)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this._$Do)===null||t===void 0||t.setConnected(!1)}render(){return V}};P.finalized=!0,P._$litElement$=!0,(le=globalThis.litElementHydrateSupport)===null||le===void 0||le.call(globalThis,{LitElement:P});var lo=globalThis.litElementPolyfillSupport;lo==null||lo({LitElement:P});((he=globalThis.litElementVersions)!==null&&he!==void 0?he:globalThis.litElementVersions=[]).push("3.3.3");var ue=new Set,Zo=()=>{let r=document.documentElement.dir==="rtl"?document.documentElement.dir:"ltr";ue.forEach(t=>{t.setAttribute("dir",r)})},Jo=new MutationObserver(Zo);Jo.observe(document.documentElement,{attributes:!0,attributeFilter:["dir"]});var Qo=r=>typeof r.startManagingContentDirection!="undefined"||r.tagName==="SP-THEME";function Xo(r){class t extends r{get isLTR(){return this.dir==="ltr"}hasVisibleFocusInTree(){let o=((s=document)=>{var i;let n=s.activeElement;for(;n!=null&&n.shadowRoot&&n.shadowRoot.activeElement;)n=n.shadowRoot.activeElement;let d=n?[n]:[];for(;n;){let c=n.assignedSlot||n.parentElement||((i=n.getRootNode())==null?void 0:i.host);c&&d.push(c),n=c}return d})(this.getRootNode())[0];if(!o)return!1;try{return o.matches(":focus-visible")||o.matches(".focus-visible")}catch{return o.matches(".focus-visible")}}connectedCallback(){if(!this.hasAttribute("dir")){let o=this.assignedSlot||this.parentNode;for(;o!==document.documentElement&&!Qo(o);)o=o.assignedSlot||o.parentNode||o.host;if(this.dir=o.dir==="rtl"?o.dir:this.dir||"ltr",o===document.documentElement)ue.add(this);else{let{localName:s}=o;s.search("-")>-1&&!customElements.get(s)?customElements.whenDefined(s).then(()=>{o.startManagingContentDirection(this)}):o.startManagingContentDirection(this)}this._dirParent=o}super.connectedCallback()}disconnectedCallback(){super.disconnectedCallback(),this._dirParent&&(this._dirParent===document.documentElement?ue.delete(this):this._dirParent.stopManagingContentDirection(this),this.removeAttribute("dir"))}}return t}var T=class extends Xo(P){};var tr=(r,t)=>t.kind==="method"&&t.descriptor&&!("value"in t.descriptor)?{...t,finisher(e){e.createProperty(t.key,r)}}:{kind:"field",key:Symbol(),placement:"own",descriptor:{},originalKey:t.key,initializer(){typeof t.initializer=="function"&&(this[t.key]=t.initializer.call(this))},finisher(e){e.createProperty(t.key,r)}},er=(r,t,e)=>{t.constructor.createProperty(e,r)};function $(r){return(t,e)=>e!==void 0?er(r,t,e):tr(r,t)}var z=({finisher:r,descriptor:t})=>(e,o)=>{var s;if(o===void 0){let i=(s=e.originalKey)!==null&&s!==void 0?s:e.key,n=t!=null?{kind:"method",placement:"prototype",key:i,descriptor:t(e.key)}:{...e,key:i};return r!=null&&(n.finisher=function(d){r(d,i)}),n}{let i=e.constructor;t!==void 0&&Object.defineProperty(e,o,t(o)),r==null||r(i,o)}};var pe,or=((pe=window.HTMLSlotElement)===null||pe===void 0?void 0:pe.prototype.assignedElements)!=null?(r,t)=>r.assignedElements(t):(r,t)=>r.assignedNodes(t).filter(e=>e.nodeType===Node.ELEMENT_NODE);function ho(r){let{slot:t,selector:e}=r!=null?r:{};return z({descriptor:o=>({get(){var s;let i="slot"+(t?`[name=${t}]`:":not([name])"),n=(s=this.renderRoot)===null||s===void 0?void 0:s.querySelector(i),d=n!=null?or(n,r):[];return e?d.filter(c=>c.matches(e)):d},enumerable:!0,configurable:!0})})}function uo(r,t,e){let o,s=r;return typeof r=="object"?(s=r.slot,o=r):o={flatten:t},e?ho({slot:s,flatten:t,selector:e}):z({descriptor:i=>({get(){var n,d;let c="slot"+(s?`[name=${s}]`:":not([name])"),a=(n=this.renderRoot)===null||n===void 0?void 0:n.querySelector(c);return(d=a==null?void 0:a.assignedNodes(o))!==null&&d!==void 0?d:[]},enumerable:!0,configurable:!0})})}var rr=Object.defineProperty,sr=Object.getOwnPropertyDescriptor,ir=(r,t,e,o)=>{for(var s=o>1?void 0:o?sr(t,e):t,i=r.length-1,n;i>=0;i--)(n=r[i])&&(s=(o?n(t,e,s):n(s))||s);return o&&s&&rr(t,e,s),s};function Pt(r,{validSizes:t=["s","m","l","xl"],noDefaultSize:e,defaultSize:o="m"}={}){class s extends r{constructor(){super(...arguments),this._size=o}get size(){return this._size||o}set size(n){let d=e?null:o,c=n&&n.toLocaleLowerCase(),a=t.includes(c)?c:d;if(a&&this.setAttribute("size",a),this._size===a)return;let l=this._size;this._size=a,this.requestUpdate("size",l)}update(n){!this.hasAttribute("size")&&!e&&this.setAttribute("size",this.size),super.update(n)}}return ir([$({type:String,reflect:!0})],s.prototype,"size",1),s}var Tt=class{constructor(t,{target:e,config:o,callback:s,skipInitial:i}){this.t=new Set,this.o=!1,this.i=!1,this.h=t,e!==null&&this.t.add(e!=null?e:t),this.l=o,this.o=i!=null?i:this.o,this.callback=s,window.MutationObserver?(this.u=new MutationObserver(n=>{this.handleChanges(n),this.h.requestUpdate()}),t.addController(this)):console.warn("MutationController error: browser does not support MutationObserver.")}handleChanges(t){var e;this.value=(e=this.callback)==null?void 0:e.call(this,t,this.u)}hostConnected(){for(let t of this.t)this.observe(t)}hostDisconnected(){this.disconnect()}async hostUpdated(){let t=this.u.takeRecords();(t.length||!this.o&&this.i)&&this.handleChanges(t),this.i=!1}observe(t){this.t.add(t),this.u.observe(t,this.l),this.i=!0,this.h.requestUpdate()}disconnect(){this.u.disconnect()}};function me(r,t,e){return typeof r===t?()=>r:typeof r=="function"?r:e}var zt=class{constructor(t,{direction:e,elementEnterAction:o,elements:s,focusInIndex:i,isFocusableElement:n,listenerScope:d}={elements:()=>[]}){this._currentIndex=-1,this._direction=()=>"both",this.directionLength=5,this.elementEnterAction=c=>{},this._focused=!1,this._focusInIndex=c=>0,this.isFocusableElement=c=>!0,this._listenerScope=()=>this.host,this.offset=0,this.handleFocusin=c=>{if(!this.isEventWithinListenerScope(c))return;this.isRelatedTargetAnElement(c)&&this.hostContainsFocus();let a=c.composedPath(),l=-1;a.find(u=>(l=this.elements.indexOf(u),l!==-1)),this.currentIndex=l>-1?l:this.currentIndex},this.handleFocusout=c=>{this.isRelatedTargetAnElement(c)&&this.hostNoLongerContainsFocus()},this.handleKeydown=c=>{if(!this.acceptsEventCode(c.code)||c.defaultPrevented)return;let a=0;switch(c.code){case"ArrowRight":a+=1;break;case"ArrowDown":a+=this.direction==="grid"?this.directionLength:1;break;case"ArrowLeft":a-=1;break;case"ArrowUp":a-=this.direction==="grid"?this.directionLength:1;break;case"End":this.currentIndex=0,a-=1;break;case"Home":this.currentIndex=this.elements.length-1,a+=1;break}c.preventDefault(),this.direction==="grid"&&this.currentIndex+a<0?this.currentIndex=0:this.direction==="grid"&&this.currentIndex+a>this.elements.length-1?this.currentIndex=this.elements.length-1:this.setCurrentIndexCircularly(a),this.elementEnterAction(this.elements[this.currentIndex]),this.focus()},new Tt(t,{config:{childList:!0,subtree:!0},callback:()=>{this.handleItemMutation()}}),this.host=t,this.host.addController(this),this._elements=s,this.isFocusableElement=n||this.isFocusableElement,this._direction=me(e,"string",this._direction),this.elementEnterAction=o||this.elementEnterAction,this._focusInIndex=me(i,"number",this._focusInIndex),this._listenerScope=me(d,"object",this._listenerScope)}get currentIndex(){return this._currentIndex===-1&&(this._currentIndex=this.focusInIndex),this._currentIndex-this.offset}set currentIndex(t){this._currentIndex=t+this.offset}get direction(){return this._direction()}get elements(){return this.cachedElements||(this.cachedElements=this._elements()),this.cachedElements}set focused(t){t!==this.focused&&(this._focused=t)}get focused(){return this._focused}get focusInElement(){return this.elements[this.focusInIndex]}get focusInIndex(){return this._focusInIndex(this.elements)}isEventWithinListenerScope(t){return this._listenerScope()===this.host?!0:t.composedPath().includes(this._listenerScope())}handleItemMutation(){if(this._currentIndex==-1||this.elements.length<=this._elements().length)return;let t=this.elements[this.currentIndex];if(this.clearElementCache(),this.elements.includes(t))return;let e=this.currentIndex!==this.elements.length,o=e?1:-1;e&&this.setCurrentIndexCircularly(-1),this.setCurrentIndexCircularly(o),this.focus()}update({elements:t}={elements:()=>[]}){this.unmanage(),this._elements=t,this.clearElementCache(),this.manage()}focus(t){let e=this.elements;if(!e.length)return;let o=e[this.currentIndex];(!o||!this.isFocusableElement(o))&&(this.setCurrentIndexCircularly(1),o=e[this.currentIndex]),o&&this.isFocusableElement(o)&&o.focus(t)}clearElementCache(t=0){delete this.cachedElements,this.offset=t}setCurrentIndexCircularly(t){let{length:e}=this.elements,o=e,s=(e+this.currentIndex+t)%e;for(;o&&this.elements[s]&&!this.isFocusableElement(this.elements[s]);)s=(e+s+t)%e,o-=1;this.currentIndex=s}hostContainsFocus(){this.host.addEventListener("focusout",this.handleFocusout),this.host.addEventListener("keydown",this.handleKeydown),this.focused=!0}hostNoLongerContainsFocus(){this.host.addEventListener("focusin",this.handleFocusin),this.host.removeEventListener("focusout",this.handleFocusout),this.host.removeEventListener("keydown",this.handleKeydown),this.focused=!1}isRelatedTargetAnElement(t){let e=t.relatedTarget;return!this.elements.includes(e)}acceptsEventCode(t){if(t==="End"||t==="Home")return!0;switch(this.direction){case"horizontal":return t==="ArrowLeft"||t==="ArrowRight";case"vertical":return t==="ArrowUp"||t==="ArrowDown";case"both":case"grid":return t.startsWith("Arrow")}}manage(){this.addEventListeners()}unmanage(){this.removeEventListeners()}addEventListeners(){this.host.addEventListener("focusin",this.handleFocusin)}removeEventListeners(){this.host.removeEventListener("focusin",this.handleFocusin),this.host.removeEventListener("focusout",this.handleFocusout),this.host.removeEventListener("keydown",this.handleKeydown)}hostConnected(){this.addEventListeners()}hostDisconnected(){this.removeEventListeners()}};var cr=I`
:host{--spectrum-accordion-item-height:var(--spectrum-component-height-200);--spectrum-accordion-item-width:var(--spectrum-accordion-minimum-width);--spectrum-accordion-disclosure-indicator-height:var(
--spectrum-component-height-100
);--spectrum-accordion-disclosure-indicator-to-text-space:var(
--spectrum-accordion-disclosure-indicator-to-text
);--spectrum-accordion-edge-to-disclosure-indicator-space:var(
--spectrum-accordion-edge-to-disclosure-indicator
);--spectrum-accordion-edge-to-text-space:var(
--spectrum-accordion-edge-to-text
);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-regular-medium
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-regular-medium
);--spectrum-accordion-focus-indicator-gap:var(
--spectrum-focus-indicator-gap
);--spectrum-accordion-focus-indicator-thickness:var(
--spectrum-focus-indicator-thickness
);--spectrum-accordion-corner-radius:var(--spectrum-corner-radius-100);--spectrum-accordion-item-content-area-top-to-content:var(
--spectrum-accordion-content-area-top-to-content
);--spectrum-accordion-item-content-area-bottom-to-content:var(
--spectrum-accordion-content-area-bottom-to-content
);--spectrum-accordion-component-edge-to-text:var(
--spectrum-component-edge-to-text-75
);--spectrum-accordion-item-header-font:var(
--spectrum-sans-font-family-stack
);--spectrum-accordion-item-header-font-weight:var(
--spectrum-bold-font-weight
);--spectrum-accordion-item-header-font-style:var(
--spectrum-default-font-style
);--spectrum-accordion-item-header-font-size:var(--spectrum-font-size-300);--spectrum-accordion-item-header-line-height:1.25;--spectrum-accordion-item-content-font:var(
--spectrum-sans-font-family-stack
);--spectrum-accordion-item-content-font-weight:var(
--spectrum-body-sans-serif-font-weight
);--spectrum-accordion-item-content-font-style:var(
--spectrum-body-sans-serif-font-style
);--spectrum-accordion-item-content-font-size:var(--spectrum-body-size-s);--spectrum-accordion-item-content-line-height:var(
--spectrum-line-height-100
);--spectrum-accordion-background-color-default:rgba(var(--spectrum-gray-900-rgb),var(--spectrum-background-opacity-default));--spectrum-accordion-background-color-hover:rgba(var(--spectrum-gray-900-rgb),var(--spectrum-background-opacity-hover));--spectrum-accordion-background-color-down:rgba(var(--spectrum-gray-900-rgb),var(--spectrum-background-opacity-down));--spectrum-accordion-background-color-key-focus:rgba(var(--spectrum-gray-900-rgb),var(--spectrum-background-opacity-key-focus));--spectrum-accordion-item-header-color-default:var(
--spectrum-neutral-content-color-default
);--spectrum-accordion-item-header-color-hover:var(
--spectrum-neutral-content-color-hover
);--spectrum-accordion-item-header-color-down:var(
--spectrum-neutral-content-color-down
);--spectrum-accordion-item-header-color-key-focus:var(
--spectrum-neutral-content-color-key-focus
);--spectrum-accordion-item-header-disabled-color:var(
--spectrum-disabled-content-color
);--spectrum-accordion-item-content-disabled-color:var(
--spectrum-disabled-content-color
);--spectrum-accordion-item-content-color:var(--spectrum-body-color);--spectrum-accordion-focus-indicator-color:var(
--spectrum-focus-indicator-color
);--spectrum-accordion-divider-color:var(--spectrum-gray-300);--spectrum-accordion-min-block-size:max(var(--mod-accordion-item-height,var(--spectrum-accordion-item-height)),calc(var(
--mod-accordion-item-header-top-to-text-space,
var(--spectrum-accordion-item-header-top-to-text-space)
) + var(
--mod-accordion-item-header-bottom-to-text-space,
var(--spectrum-accordion-item-header-bottom-to-text-space)
) + var(
--mod-accordion-item-header-font-size,
var(--spectrum-accordion-item-header-font-size)
)*var(
--mod-accordion-item-header-line-height,
var(--spectrum-accordion-item-header-line-height)
)))}:host:lang(ja),:host:lang(ko),:host:lang(zh){--spectrum-accordion-item-header-line-height:var(
--spectrum-cjk-line-height-100
)}:host:lang(ja),:host:lang(ko),:host:lang(zh){--spectrum-accordion-item-content-line-height:var(
--spectrum-cjk-line-height-100
)}:host([density=compact]){--spectrum-accordion-item-height:var(--spectrum-component-height-100);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-compact-medium
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-compact-medium
)}:host([density=compact][size=s]){--spectrum-accordion-item-height:var(--spectrum-component-height-75);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-compact-small
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-compact-small
)}:host([density=compact][size=l]){--spectrum-accordion-item-height:var(--spectrum-component-height-200);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-compact-large
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-compact-large
)}:host([density=compact][size=xl]){--spectrum-accordion-item-height:var(--spectrum-component-height-300);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-compact-extra-large
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-compact-extra-large
)}:host([density=spacious]){--spectrum-accordion-item-header-line-height:1.278;--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-spacious-medium
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-spacious-medium
)}:host([density=spacious][size=s]){--spectrum-accordion-item-header-line-height:1.25;--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-small-top-to-text-spacious
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-spacious-small
)}:host([density=spacious][size=l]){--spectrum-accordion-item-header-line-height:1.273;--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-spacious-large
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-spacious-large
)}:host([density=spacious][size=xl]){--spectrum-accordion-item-header-line-height:1.25;--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-spacious-extra-large
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-spacious-extra-large
)}:host([size=s]){--spectrum-accordion-item-height:var(--spectrum-component-height-100);--spectrum-accordion-disclosure-indicator-height:var(
--spectrum-component-height-75
);--spectrum-accordion-component-edge-to-text:var(
--spectrum-component-edge-to-text-50
);--spectrum-accordion-item-header-font-size:var(--spectrum-font-size-200);--spectrum-accordion-item-content-font-size:var(--spectrum-body-size-xs);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-regular-small
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-regular-small
)}:host([size=l]){--spectrum-accordion-item-height:var(--spectrum-component-height-300);--spectrum-accordion-disclosure-indicator-height:var(
--spectrum-component-height-200
);--spectrum-accordion-component-edge-to-text:var(
--spectrum-component-edge-to-text-100
);--spectrum-accordion-item-header-font-size:var(--spectrum-font-size-500);--spectrum-accordion-item-content-font-size:var(--spectrum-body-size-m);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-regular-large
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-regular-large
)}:host([size=xl]){--spectrum-accordion-item-height:var(--spectrum-component-height-400);--spectrum-accordion-disclosure-indicator-height:var(
--spectrum-component-height-300
);--spectrum-accordion-component-edge-to-text:var(
--spectrum-component-edge-to-text-200
);--spectrum-accordion-item-header-font-size:var(--spectrum-font-size-700);--spectrum-accordion-item-content-font-size:var(--spectrum-body-size-l);--spectrum-accordion-item-header-top-to-text-space:var(
--spectrum-accordion-top-to-text-regular-extra-large
);--spectrum-accordion-item-header-bottom-to-text-space:var(
--spectrum-accordion-bottom-to-text-regular-extra-large
)}:host{display:block;list-style:none;margin:0;padding:0}
`,po=cr;var ar=Object.defineProperty,dr=Object.getOwnPropertyDescriptor,ve=(r,t,e,o)=>{for(var s=o>1?void 0:o?dr(t,e):t,i=r.length-1,n;i>=0;i--)(n=r[i])&&(s=(o?n(t,e,s):n(s))||s);return o&&s&&ar(t,e,s),s},q=class extends Pt(T,{noDefaultSize:!0}){constructor(){super(...arguments),this.allowMultiple=!1,this.focusGroupController=new zt(this,{direction:"vertical",elements:()=>this.items,isFocusableElement:t=>!t.disabled})}static get styles(){return[po]}get items(){return[...this.defaultNodes||[]].filter(t=>typeof t.tagName!="undefined")}focus(){this.focusGroupController.focus()}async onToggle(t){let e=t.target;if(await 0,this.allowMultiple||t.defaultPrevented)return;let o=[...this.items];o&&!o.length||o.forEach(s=>{s!==e&&(s.open=!1)})}handleSlotchange(){this.focusGroupController.clearElementCache(),this.items.forEach(t=>{t.size=this.size})}updated(t){super.updated(t),t.has("size")&&(t.get("size")||this.size!=="m")&&this.items.forEach(e=>{e.size=this.size})}render(){return E`
            <slot
                @slotchange=${this.handleSlotchange}
                @sp-accordion-item-toggle=${this.onToggle}
            ></slot>
        `}};ve([$({type:Boolean,reflect:!0,attribute:"allow-multiple"})],q.prototype,"allowMultiple",2),ve([$({type:String,reflect:!0})],q.prototype,"density",2),ve([uo()],q.prototype,"defaultNodes",2);function Q(r,t){window.__swc,customElements.define(r,t)}Q("sp-accordion",q);var ge=!0;try{document.body.querySelector(":focus-visible")}catch{ge=!1,Promise.resolve().then(()=>jo(vo(),1))}var fo=r=>{var t;let e=i=>{if(i.shadowRoot==null||i.hasAttribute("data-js-focus-visible"))return()=>{};if(self.applyFocusVisiblePolyfill)self.applyFocusVisiblePolyfill(i.shadowRoot),i.manageAutoFocus&&i.manageAutoFocus();else{let n=()=>{self.applyFocusVisiblePolyfill&&i.shadowRoot&&self.applyFocusVisiblePolyfill(i.shadowRoot),i.manageAutoFocus&&i.manageAutoFocus()};return self.addEventListener("focus-visible-polyfill-ready",n,{once:!0}),()=>{self.removeEventListener("focus-visible-polyfill-ready",n)}}return()=>{}},o=Symbol("endPolyfillCoordination");class s extends r{constructor(){super(...arguments),this[t]=null}connectedCallback(){super.connectedCallback&&super.connectedCallback(),ge||requestAnimationFrame(()=>{this[o]==null&&(this[o]=e(this))})}disconnectedCallback(){super.disconnectedCallback&&super.disconnectedCallback(),ge||requestAnimationFrame(()=>{this[o]!=null&&(this[o](),this[o]=null)})}}return t=o,s};var lr=Object.defineProperty,hr=Object.getOwnPropertyDescriptor,be=(r,t,e,o)=>{for(var s=o>1?void 0:o?hr(t,e):t,i=r.length-1,n;i>=0;i--)(n=r[i])&&(s=(o?n(t,e,s):n(s))||s);return o&&s&&lr(t,e,s),s};function go(){return new Promise(r=>requestAnimationFrame(()=>r()))}var K=class extends fo(T){constructor(){super(...arguments),this.disabled=!1,this.autofocus=!1,this._tabIndex=0,this.manipulatingTabindex=!1,this._recentlyConnected=!1}get tabIndex(){if(this.focusElement===this){let e=this.hasAttribute("tabindex")?Number(this.getAttribute("tabindex")):NaN;return isNaN(e)?-1:e}let t=parseFloat(this.hasAttribute("tabindex")&&this.getAttribute("tabindex")||"0");return this.disabled||t<0?-1:this.focusElement?this.focusElement.tabIndex:t}set tabIndex(t){if(this.manipulatingTabindex){this.manipulatingTabindex=!1;return}if(this.focusElement===this){if(t!==this._tabIndex){this._tabIndex=t;let e=this.disabled?"-1":""+t;this.manipulatingTabindex=!0,this.setAttribute("tabindex",e)}return}if(t===-1?this.addEventListener("pointerdown",this.onPointerdownManagementOfTabIndex):(this.manipulatingTabindex=!0,this.removeEventListener("pointerdown",this.onPointerdownManagementOfTabIndex)),t===-1||this.disabled){this.setAttribute("tabindex","-1"),this.removeAttribute("focusable"),t!==-1&&this.manageFocusElementTabindex(t);return}this.setAttribute("focusable",""),this.hasAttribute("tabindex")?this.removeAttribute("tabindex"):this.manipulatingTabindex=!1,this.manageFocusElementTabindex(t)}onPointerdownManagementOfTabIndex(){this.tabIndex===-1&&(this.tabIndex=0,this.focus({preventScroll:!0}))}async manageFocusElementTabindex(t){this.focusElement||await this.updateComplete,t===null?this.focusElement.removeAttribute("tabindex"):this.focusElement.tabIndex=t}get focusElement(){throw new Error("Must implement focusElement getter!")}focus(t){this.disabled||!this.focusElement||(this.focusElement!==this?this.focusElement.focus(t):HTMLElement.prototype.focus.apply(this,[t]))}blur(){let t=this.focusElement||this;t!==this?t.blur():HTMLElement.prototype.blur.apply(this)}click(){if(this.disabled)return;let t=this.focusElement||this;t!==this?t.click():HTMLElement.prototype.click.apply(this)}manageAutoFocus(){this.autofocus&&(this.dispatchEvent(new KeyboardEvent("keydown",{code:"Tab"})),this.focusElement.focus())}firstUpdated(t){super.firstUpdated(t),(!this.hasAttribute("tabindex")||this.getAttribute("tabindex")!=="-1")&&this.setAttribute("focusable","")}update(t){t.has("disabled")&&this.handleDisabledChanged(this.disabled,t.get("disabled")),super.update(t)}updated(t){super.updated(t),t.has("disabled")&&this.disabled&&this.blur()}async handleDisabledChanged(t,e){let o=()=>this.focusElement!==this&&typeof this.focusElement.disabled!="undefined";t?(this.manipulatingTabindex=!0,this.setAttribute("tabindex","-1"),await this.updateComplete,o()?this.focusElement.disabled=!0:this.setAttribute("aria-disabled","true")):e&&(this.manipulatingTabindex=!0,this.focusElement===this?this.setAttribute("tabindex",""+this._tabIndex):this.removeAttribute("tabindex"),await this.updateComplete,o()?this.focusElement.disabled=!1:this.removeAttribute("aria-disabled"))}async getUpdateComplete(){let t=await super.getUpdateComplete();return this._recentlyConnected&&(this._recentlyConnected=!1,await go(),await go()),t}connectedCallback(){super.connectedCallback(),this._recentlyConnected=!0,this.updateComplete.then(()=>{this.manageAutoFocus()})}};be([$({type:Boolean,reflect:!0})],K.prototype,"disabled",2),be([$({type:Boolean})],K.prototype,"autofocus",2),be([$({type:Number})],K.prototype,"tabIndex",1);var x={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},C=r=>(...t)=>({_$litDirective$:r,values:t}),A=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,o){this._$Ct=t,this._$AM=e,this._$Ci=o}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};var{I:ur}=Ve,yo=r=>r===null||typeof r!="object"&&typeof r!="function";var Lt=r=>r.strings===void 0,bo=()=>document.createComment(""),X=(r,t,e)=>{var o;let s=r._$AA.parentNode,i=t===void 0?r._$AB:t._$AA;if(e===void 0){let n=s.insertBefore(bo(),i),d=s.insertBefore(bo(),i);e=new ur(n,d,r,r.options)}else{let n=e._$AB.nextSibling,d=e._$AM,c=d!==r;if(c){let a;(o=e._$AQ)===null||o===void 0||o.call(e,r),e._$AM=r,e._$AP!==void 0&&(a=r._$AU)!==d._$AU&&e._$AP(a)}if(n!==i||c){let a=e._$AA;for(;a!==n;){let l=a.nextSibling;s.insertBefore(a,i),a=l}}}return e},L=(r,t,e=r)=>(r._$AI(t,e),r),pr={},Rt=(r,t=pr)=>r._$AH=t,_o=r=>r._$AH,Nt=r=>{var t;(t=r._$AP)===null||t===void 0||t.call(r,!1,!0);let e=r._$AA,o=r._$AB.nextSibling;for(;e!==o;){let s=e.nextSibling;e.remove(),e=s}};var $o=(r,t,e)=>{let o=new Map;for(let s=t;s<=e;s++)o.set(r[s],s);return o},mr=C(class extends A{constructor(r){if(super(r),r.type!==x.CHILD)throw Error("repeat() can only be used in text expressions")}ct(r,t,e){let o;e===void 0?e=t:t!==void 0&&(o=t);let s=[],i=[],n=0;for(let d of r)s[n]=o?o(d,n):n,i[n]=e(d,n),n++;return{values:i,keys:s}}render(r,t,e){return this.ct(r,t,e).values}update(r,[t,e,o]){var s;let i=_o(r),{values:n,keys:d}=this.ct(t,e,o);if(!Array.isArray(i))return this.ut=d,n;let c=(s=this.ut)!==null&&s!==void 0?s:this.ut=[],a=[],l,u,h=0,p=i.length-1,v=0,f=n.length-1;for(;h<=p&&v<=f;)if(i[h]===null)h++;else if(i[p]===null)p--;else if(c[h]===d[v])a[v]=L(i[h],n[v]),h++,v++;else if(c[p]===d[f])a[f]=L(i[p],n[f]),p--,f--;else if(c[h]===d[f])a[f]=L(i[h],n[f]),X(r,a[f+1],i[h]),h++,f--;else if(c[p]===d[v])a[v]=L(i[p],n[v]),X(r,i[h],i[p]),p--,v++;else if(l===void 0&&(l=$o(d,v,f),u=$o(c,h,p)),l.has(c[h]))if(l.has(c[p])){let w=u.get(d[v]),et=w!==void 0?i[w]:null;if(et===null){let g=X(r,i[h]);L(g,n[v]),a[v]=g}else a[v]=L(et,n[v]),X(r,i[h],et),i[w]=null;v++}else Nt(i[p]),p--;else Nt(i[h]),h++;for(;v<=f;){let w=X(r,a[f+1]);L(w,n[v]),a[v++]=w}for(;h<=p;){let w=i[h++];w!==null&&Nt(w)}return this.ut=d,Rt(r,a),y}});var vr=C(class extends A{constructor(r){var t;if(super(r),r.type!==x.ATTRIBUTE||r.name!=="class"||((t=r.strings)===null||t===void 0?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(r){return" "+Object.keys(r).filter(t=>r[t]).join(" ")+" "}update(r,[t]){var e,o;if(this.it===void 0){this.it=new Set,r.strings!==void 0&&(this.nt=new Set(r.strings.join(" ").split(/\s/).filter(i=>i!=="")));for(let i in t)t[i]&&!(!((e=this.nt)===null||e===void 0)&&e.has(i))&&this.it.add(i);return this.render(t)}let s=r.element.classList;this.it.forEach(i=>{i in t||(s.remove(i),this.it.delete(i))});for(let i in t){let n=!!t[i];n===this.it.has(i)||!((o=this.nt)===null||o===void 0)&&o.has(i)||(n?(s.add(i),this.it.add(i)):(s.remove(i),this.it.delete(i)))}return y}});var xo="important",fr=" !"+xo,gr=C(class extends A{constructor(r){var t;if(super(r),r.type!==x.ATTRIBUTE||r.name!=="style"||((t=r.strings)===null||t===void 0?void 0:t.length)>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(r){return Object.keys(r).reduce((t,e)=>{let o=r[e];return o==null?t:t+`${e=e.includes("-")?e:e.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${o};`},"")}update(r,[t]){let{style:e}=r.element;if(this.ht===void 0){this.ht=new Set;for(let o in t)this.ht.add(o);return this.render(t)}this.ht.forEach(o=>{t[o]==null&&(this.ht.delete(o),o.includes("-")?e.removeProperty(o):e[o]="")});for(let o in t){let s=t[o];if(s!=null){this.ht.add(o);let i=typeof s=="string"&&s.endsWith(fr);o.includes("-")||i?e.setProperty(o,i?s.slice(0,-11):s,i?xo:""):e[o]=s}}return y}});var ut=(r,t)=>{var e,o;let s=r._$AN;if(s===void 0)return!1;for(let i of s)(o=(e=i)._$AO)===null||o===void 0||o.call(e,t,!1),ut(i,t);return!0},Mt=r=>{let t,e;do{if((t=r._$AM)===void 0)break;e=t._$AN,e.delete(r),r=t}while((e==null?void 0:e.size)===0)},Ao=r=>{for(let t;t=r._$AM;r=t){let e=t._$AN;if(e===void 0)t._$AN=e=new Set;else if(e.has(r))break;e.add(r),_r(t)}};function br(r){this._$AN!==void 0?(Mt(this),this._$AM=r,Ao(this)):this._$AM=r}function yr(r,t=!1,e=0){let o=this._$AH,s=this._$AN;if(s!==void 0&&s.size!==0)if(t)if(Array.isArray(o))for(let i=e;i<o.length;i++)ut(o[i],!1),Mt(o[i]);else o!=null&&(ut(o,!1),Mt(o));else ut(this,r)}var _r=r=>{var t,e,o,s;r.type==x.CHILD&&((t=(o=r)._$AP)!==null&&t!==void 0||(o._$AP=yr),(e=(s=r)._$AQ)!==null&&e!==void 0||(s._$AQ=br))},Ot=class extends A{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,e,o){super._$AT(t,e,o),Ao(this),this.isConnected=t._$AU}_$AO(t,e=!0){var o,s;t!==this.isConnected&&(this.isConnected=t,t?(o=this.reconnected)===null||o===void 0||o.call(this):(s=this.disconnected)===null||s===void 0||s.call(this)),e&&(ut(this,t),Mt(this))}setValue(t){if(Lt(this._$Ct))this._$Ct._$AI(t,this);else{let e=[...this._$Ct._$AH];e[this._$Ci]=t,this._$Ct._$AI(e,this,0)}}disconnected(){}reconnected(){}};var Ht=class{constructor(t){this.G=t}disconnect(){this.G=void 0}reconnect(t){this.G=t}deref(){return this.G}},Dt=class{constructor(){this.Y=void 0,this.Z=void 0}get(){return this.Y}pause(){var t;(t=this.Y)!==null&&t!==void 0||(this.Y=new Promise(e=>this.Z=e))}resume(){var t;(t=this.Z)===null||t===void 0||t.call(this),this.Y=this.Z=void 0}};var wo=r=>!yo(r)&&typeof r.then=="function",Eo=1073741823,ye=class extends Ot{constructor(){super(...arguments),this._$C_t=Eo,this._$Cwt=[],this._$Cq=new Ht(this),this._$CK=new Dt}render(...t){var e;return(e=t.find(o=>!wo(o)))!==null&&e!==void 0?e:y}update(t,e){let o=this._$Cwt,s=o.length;this._$Cwt=e;let i=this._$Cq,n=this._$CK;this.isConnected||this.disconnected();for(let d=0;d<e.length&&!(d>this._$C_t);d++){let c=e[d];if(!wo(c))return this._$C_t=d,c;d<s&&c===o[d]||(this._$C_t=Eo,s=0,Promise.resolve(c).then(async a=>{for(;n.get();)await n.get();let l=i.deref();if(l!==void 0){let u=l._$Cwt.indexOf(c);u>-1&&u<l._$C_t&&(l._$C_t=u,l.setValue(a))}}))}return y}disconnected(){this._$Cq.disconnect(),this._$CK.pause()}reconnected(){this._$Cq.reconnect(this),this._$CK.resume()}},$r=C(ye);var xr=C(class extends A{constructor(r){if(super(r),r.type!==x.PROPERTY&&r.type!==x.ATTRIBUTE&&r.type!==x.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Lt(r))throw Error("`live` bindings can only contain a single expression")}render(r){return r}update(r,[t]){if(t===y||t===b)return t;let e=r.element,o=r.name;if(r.type===x.PROPERTY){if(t===e[o])return y}else if(r.type===x.BOOLEAN_ATTRIBUTE){if(!!t===e.hasAttribute(o))return y}else if(r.type===x.ATTRIBUTE&&e.getAttribute(o)===t+"")return y;return Rt(r),t}});function _e(r,t,e){return r?t():e==null?void 0:e()}var Ar=I`
:host{fill:currentColor;color:inherit;display:inline-block;pointer-events:none}:host(:not(:root)){overflow:hidden}@media (forced-colors:active){:host{forced-color-adjust:auto}}:host{--spectrum-icon-size-s:var(
--spectrum-alias-workflow-icon-size-s,var(--spectrum-global-dimension-size-200)
);--spectrum-icon-size-m:var(
--spectrum-alias-workflow-icon-size-m,var(--spectrum-global-dimension-size-225)
);--spectrum-icon-size-l:var(--spectrum-alias-workflow-icon-size-l);--spectrum-icon-size-xl:var(
--spectrum-alias-workflow-icon-size-xl,var(--spectrum-global-dimension-size-275)
);--spectrum-icon-size-xxl:var(--spectrum-global-dimension-size-400)}:host([size=s]){height:var(--spectrum-icon-size-s);width:var(--spectrum-icon-size-s)}:host([size=m]){height:var(--spectrum-icon-size-m);width:var(--spectrum-icon-size-m)}:host([size=l]){height:var(--spectrum-icon-size-l);width:var(--spectrum-icon-size-l)}:host([size=xl]){height:var(--spectrum-icon-size-xl);width:var(--spectrum-icon-size-xl)}:host([size=xxl]){height:var(--spectrum-icon-size-xxl);width:var(--spectrum-icon-size-xxl)}:host{height:var(
--spectrum-icon-tshirt-size-height,var(
--spectrum-alias-workflow-icon-size,var(--spectrum-global-dimension-size-225)
)
);width:var(
--spectrum-icon-tshirt-size-width,var(
--spectrum-alias-workflow-icon-size,var(--spectrum-global-dimension-size-225)
)
)}#container{height:100%}::slotted(*),img,svg{color:inherit;height:100%;vertical-align:top;width:100%}@media (forced-colors:active){::slotted(*),img,svg{forced-color-adjust:auto}}
`,Co=Ar;var wr=Object.defineProperty,Er=Object.getOwnPropertyDescriptor,So=(r,t,e,o)=>{for(var s=o>1?void 0:o?Er(t,e):t,i=r.length-1,n;i>=0;i--)(n=r[i])&&(s=(o?n(t,e,s):n(s))||s);return o&&s&&wr(t,e,s),s},tt=class extends T{constructor(){super(...arguments),this.label=""}static get styles(){return[Co]}update(t){t.has("label")&&(this.label?this.removeAttribute("aria-hidden"):this.setAttribute("aria-hidden","true")),super.update(t)}render(){return E`
            <slot></slot>
        `}};So([$()],tt.prototype,"label",2),So([$({reflect:!0})],tt.prototype,"size",2);var $e,Io=function(r,...t){return $e?$e(r,...t):t.reduce((e,o,s)=>e+o+r[s+1],r[0])},ko=r=>{$e=r};var Uo=({width:r=24,height:t=24,title:e="Chevron100"}={})=>Io`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 10 10"
    aria-hidden="true"
    role="img"
    fill="currentColor"
    aria-label=${e}
    width=${r}
    height=${t}
  >
    <path
      d="M3 9.95a.875.875 0 01-.615-1.498L5.88 5 2.385 1.547A.875.875 0 013.615.302L7.74 4.377a.876.876 0 010 1.246L3.615 9.698A.872.872 0 013 9.95z"
    />
  </svg>`;var jt=class extends tt{render(){return ko(E),Uo()}};Q("sp-icon-chevron100",jt);var Cr=I`
.spectrum-UIIcon-ChevronDown100,.spectrum-UIIcon-ChevronDown200,.spectrum-UIIcon-ChevronDown300,.spectrum-UIIcon-ChevronDown400,.spectrum-UIIcon-ChevronDown500,.spectrum-UIIcon-ChevronDown75{transform:rotate(90deg)}.spectrum-UIIcon-ChevronLeft100,.spectrum-UIIcon-ChevronLeft200,.spectrum-UIIcon-ChevronLeft300,.spectrum-UIIcon-ChevronLeft400,.spectrum-UIIcon-ChevronLeft500,.spectrum-UIIcon-ChevronLeft75{transform:rotate(180deg)}.spectrum-UIIcon-ChevronUp100,.spectrum-UIIcon-ChevronUp200,.spectrum-UIIcon-ChevronUp300,.spectrum-UIIcon-ChevronUp400,.spectrum-UIIcon-ChevronUp500,.spectrum-UIIcon-ChevronUp75{transform:rotate(270deg)}.spectrum-UIIcon-ChevronDown75,.spectrum-UIIcon-ChevronLeft75,.spectrum-UIIcon-ChevronRight75,.spectrum-UIIcon-ChevronUp75{height:var(--spectrum-alias-ui-icon-chevron-size-75);width:var(--spectrum-alias-ui-icon-chevron-size-75)}.spectrum-UIIcon-ChevronDown100,.spectrum-UIIcon-ChevronLeft100,.spectrum-UIIcon-ChevronRight100,.spectrum-UIIcon-ChevronUp100{height:var(--spectrum-alias-ui-icon-chevron-size-100);width:var(--spectrum-alias-ui-icon-chevron-size-100)}.spectrum-UIIcon-ChevronDown200,.spectrum-UIIcon-ChevronLeft200,.spectrum-UIIcon-ChevronRight200,.spectrum-UIIcon-ChevronUp200{height:var(--spectrum-alias-ui-icon-chevron-size-200);width:var(--spectrum-alias-ui-icon-chevron-size-200)}.spectrum-UIIcon-ChevronDown300,.spectrum-UIIcon-ChevronLeft300,.spectrum-UIIcon-ChevronRight300,.spectrum-UIIcon-ChevronUp300{height:var(--spectrum-alias-ui-icon-chevron-size-300);width:var(--spectrum-alias-ui-icon-chevron-size-300)}.spectrum-UIIcon-ChevronDown400,.spectrum-UIIcon-ChevronLeft400,.spectrum-UIIcon-ChevronRight400,.spectrum-UIIcon-ChevronUp400{height:var(--spectrum-alias-ui-icon-chevron-size-400);width:var(--spectrum-alias-ui-icon-chevron-size-400)}.spectrum-UIIcon-ChevronDown500,.spectrum-UIIcon-ChevronLeft500,.spectrum-UIIcon-ChevronRight500,.spectrum-UIIcon-ChevronUp500{height:var(--spectrum-alias-ui-icon-chevron-size-500);width:var(--spectrum-alias-ui-icon-chevron-size-500)}
`,Po=Cr;var Sr=I`
:host{border-block-end:1px solid #0000;border-color:var(
--mod-accordion-divider-color,var(--spectrum-accordion-divider-color)
);border-width:var(
--mod-accordion-divider-thickness,var(--spectrum-divider-thickness-small)
);margin:0;min-block-size:var(
--mod-accordion-item-height,var(--spectrum-accordion-item-height)
);min-inline-size:var(
--mod-accordion-item-width,var(--spectrum-accordion-item-width)
);position:relative;z-index:inherit}:host(:first-child){border-block-start:1px solid #0000;border-color:var(
--mod-accordion-divider-color,var(--spectrum-accordion-divider-color)
);border-width:var(
--mod-accordion-divider-thickness,var(--spectrum-divider-thickness-small)
)}#heading{box-sizing:border-box;margin:0}.iconContainer{align-items:center;block-size:var(
--mod-accordion-disclosure-indicator-height,var(--spectrum-accordion-disclosure-indicator-height)
);color:var(
--mod-accordion-item-header-color-default,var(--spectrum-accordion-item-header-color-default)
);display:flex;inline-size:var(
--mod-accordion-disclosure-indicator-height,var(--spectrum-accordion-disclosure-indicator-height)
);inset-block-start:max(0px,calc((var(
--mod-accordion-min-block-size,
var(--spectrum-accordion-min-block-size)
) - var(
--mod-accordion-disclosure-indicator-height,
var(
--spectrum-accordion-disclosure-indicator-height
)
))/2));justify-content:center;padding-inline-start:var(
--mod-accordion-edge-to-disclosure-indicator-space,var(--spectrum-accordion-edge-to-disclosure-indicator-space)
);position:absolute}:host([dir=rtl]) .iconContainer{transform:scaleX(-1)}#content{color:var(
--mod-accordion-item-content-color,var(--spectrum-accordion-item-content-color)
);display:none;font-family:var(
--mod-accordion-item-content-font,var(--spectrum-accordion-item-content-font)
);font-size:var(
--mod-accordion-item-content-font-size,var(--spectrum-accordion-item-content-font-size)
);font-style:var(
--mod-accordion-item-content-font-style,var(--spectrum-accordion-item-content-font-style)
);font-weight:var(
--mod-accordion-item-content-font-weight,var(--spectrum-accordion-item-content-font-weight)
);line-height:var(
--mod-accordion-item-content-line-height,var(--spectrum-accordion-item-content-line-height)
);padding-block:var(
--mod-accordion-item-content-area-top-to-content,var(--spectrum-accordion-item-content-area-top-to-content)
) var(
--mod-accordion-item-content-area-bottom-to-content,var(--spectrum-accordion-item-content-area-bottom-to-content)
);padding-inline:var(
--mod-accordion-component-edge-to-text,var(--spectrum-accordion-component-edge-to-text)
) var(
--mod-accordion-component-edge-to-text,var(--spectrum-accordion-component-edge-to-text)
)}#header{align-items:center;appearance:none;background-color:var(
--mod-accordion-background-color-default,var(--spectrum-accordion-background-color-default)
);border:0;box-sizing:border-box;color:var(
--mod-accordion-item-header-color-default,var(--spectrum-accordion-item-header-color-default)
);cursor:pointer;display:flex;font-family:var(
--mod-accordion-item-header-font,var(--spectrum-accordion-item-header-font)
);font-size:var(
--mod-accordion-item-header-font-size,var(--spectrum-accordion-item-header-font-size)
);font-style:var(
--mod-accordion-item-header-font-style,var(--spectrum-accordion-item-header-font-style)
);font-weight:var(
--mod-accordion-item-header-font-weight,var(--spectrum-accordion-item-header-font-weight)
);inline-size:100%;justify-content:flex-start;line-height:var(
--mod-accordion-item-header-line-height,var(--spectrum-accordion-item-header-line-height)
);min-block-size:var(
--mod-accordion-min-block-size,var(--spectrum-accordion-min-block-size)
);padding-block:var(
--mod-accordion-item-header-top-to-text-space,var(--spectrum-accordion-item-header-top-to-text-space)
) var(
--mod-accordion-item-header-bottom-to-text-space,var(--spectrum-accordion-item-header-bottom-to-text-space)
);padding-inline-end:var(
--mod-accordion-edge-to-text-space,var(--spectrum-accordion-edge-to-text-space)
);padding-inline-start:calc(var(
--mod-accordion-disclosure-indicator-to-text-space,
var(--spectrum-accordion-disclosure-indicator-to-text-space)
) + var(
--mod-accordion-disclosure-indicator-height,
var(--spectrum-accordion-disclosure-indicator-height)
));position:relative;text-align:start;text-overflow:ellipsis}#header:focus{outline:none}#header:focus:after{content:"";inset-inline-start:0;position:absolute}#header:hover{background-color:var(
--mod-accordion-background-color-hover,var(--spectrum-accordion-background-color-hover)
);color:var(
--mod-accordion-item-header-color-hover,var(--spectrum-accordion-item-header-color-hover)
)}#header:hover+.iconContainer{color:var(
--mod-accordion-item-header-color-hover,var(--spectrum-accordion-item-header-color-hover)
)}#header.focus-visible{background-color:var(
--mod-accordion-background-color-key-focus,var(--spectrum-accordion-background-color-key-focus)
);border-radius:var(
--mod-accordion-corner-radius,var(--spectrum-accordion-corner-radius)
);color:var(
--mod-accordion-item-header-color-key-focus,var(--spectrum-accordion-item-header-color-key-focus)
);outline:var(
--mod-accordion-focus-indicator-thickness,var(--spectrum-accordion-focus-indicator-thickness)
) solid var(
--mod-accordion-focus-indicator-color,var(--spectrum-accordion-focus-indicator-color)
);outline-offset:calc(var(
--mod-accordion-focus-indicator-gap,
var(--spectrum-accordion-focus-indicator-gap)
)*-1)}#header:focus-visible{background-color:var(
--mod-accordion-background-color-key-focus,var(--spectrum-accordion-background-color-key-focus)
);border-radius:var(
--mod-accordion-corner-radius,var(--spectrum-accordion-corner-radius)
);color:var(
--mod-accordion-item-header-color-key-focus,var(--spectrum-accordion-item-header-color-key-focus)
);outline:var(
--mod-accordion-focus-indicator-thickness,var(--spectrum-accordion-focus-indicator-thickness)
) solid var(
--mod-accordion-focus-indicator-color,var(--spectrum-accordion-focus-indicator-color)
);outline-offset:calc(var(
--mod-accordion-focus-indicator-gap,
var(--spectrum-accordion-focus-indicator-gap)
)*-1)}#header:active{background-color:var(
--mod-accordion-background-color-down,var(--spectrum-accordion-background-color-down)
);color:var(
--mod-accordion-item-header-color-down,var(--spectrum-accordion-item-header-color-down)
)}:host([open]) #header:hover{background-color:var(
--mod-accordion-background-color-hover,var(--spectrum-accordion-background-color-hover)
)}:host([disabled]) #header,:host([disabled]) #header.focus-visible,:host([disabled]) #header:hover{background-color:#0000;color:var(
--mod-accordion-item-header-disabled-color,var(--spectrum-accordion-item-header-disabled-color)
)}:host([disabled]) #header,:host([disabled]) #header:focus-visible,:host([disabled]) #header:hover{background-color:#0000;color:var(
--mod-accordion-item-header-disabled-color,var(--spectrum-accordion-item-header-disabled-color)
)}:host([disabled]) #header+.iconContainer{color:var(
--mod-accordion-item-header-disabled-color,var(--spectrum-accordion-item-header-disabled-color)
)}:host([disabled]) #content{color:var(
--mod-accordion-item-content-disabled-color,var(--spectrum-accordion-item-content-disabled-color)
)}@media (forced-colors:active){#header:after{content:"";forced-color-adjust:none;inset-inline-start:0;position:absolute}}:host([dir=ltr][open])>#heading>.iconContainer>.indicator{transform:rotate(90deg)}:host([dir=rtl][open])>#heading>.iconContainer>.indicator{transform:matrix(-1,0,0,1,0,0) rotate(90deg)}:host([dir=ltr][open])>.iconContainer>.indicator{transform:rotate(90deg)}:host([dir=rtl][open])>.iconContainer>.indicator{transform:matrix(-1,0,0,1,0,0) rotate(90deg)}:host([open])>#content{display:block}:host([disabled]) #header{cursor:default}:host{display:block}#heading{height:auto;position:relative}:host([disabled]) #heading .indicator{color:var(
--mod-accordion-item-header-disabled-color,var(--spectrum-accordion-item-header-disabled-color)
)}
`,To=Sr;var Ir=Object.defineProperty,kr=Object.getOwnPropertyDescriptor,xe=(r,t,e,o)=>{for(var s=o>1?void 0:o?kr(t,e):t,i=r.length-1,n;i>=0;i--)(n=r[i])&&(s=(o?n(t,e,s):n(s))||s);return o&&s&&Ir(t,e,s),s},Ur={s:()=>E`
        <span class="iconContainer">
            <sp-icon-chevron100
                class="indicator spectrum-UIIcon-ChevronRight75"
                slot="icon"
            ></sp-icon-chevron100>
        </span>
    `,m:()=>E`
        <span class="iconContainer">
            <sp-icon-chevron100
                class="indicator spectrum-UIIcon-ChevronRight100"
                slot="icon"
            ></sp-icon-chevron100>
        </span>
    `,l:()=>E`
        <span class="iconContainer">
            <sp-icon-chevron100
                class="indicator spectrum-UIIcon-ChevronRight200"
                slot="icon"
            ></sp-icon-chevron100>
        </span>
    `,xl:()=>E`
        <span class="iconContainer">
            <sp-icon-chevron100
                class="indicator spectrum-UIIcon-ChevronRight300"
                slot="icon"
            ></sp-icon-chevron100>
        </span>
    `},W=class extends Pt(K,{noDefaultSize:!0}){constructor(){super(...arguments),this.open=!1,this.label="",this.disabled=!1,this.renderChevronIcon=()=>Ur[this.size||"m"]()}static get styles(){return[To,Po]}get focusElement(){return this.shadowRoot.querySelector("#header")}onClick(){this.disabled||this.toggle()}toggle(){this.open=!this.open,this.dispatchEvent(new CustomEvent("sp-accordion-item-toggle",{bubbles:!0,composed:!0,cancelable:!0}))||(this.open=!this.open)}render(){return E`
            <h3 id="heading">
                ${_e(this.size,this.renderChevronIcon)}
                <button
                    id="header"
                    @click=${this.onClick}
                    aria-expanded=${this.open}
                    aria-controls="content"
                    ?disabled=${this.disabled}
                >
                    ${this.label}
                </button>
            </h3>
            <div id="content" role="region" aria-labelledby="header">
                <slot></slot>
            </div>
        `}updated(t){super.updated(t),t.has("disabled")&&(this.disabled?this.setAttribute("aria-disabled","true"):this.removeAttribute("aria-disabled"))}};xe([$({type:Boolean,reflect:!0})],W.prototype,"open",2),xe([$({type:String,reflect:!0})],W.prototype,"label",2),xe([$({type:Boolean,reflect:!0})],W.prototype,"disabled",2);Q("sp-accordion-item",W);try{window.__CUTMARK_SWC_ENV__="ready"}catch{}})();
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/custom-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/property.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/state.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/base.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/event-options.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-all.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-async.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit-labs/observers/mutation-controller.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/if-defined.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive-helpers.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/repeat.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/class-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/style-map.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/async-directive.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/private-async-helpers.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/until.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/live.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directives/when.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
//# sourceMappingURL=swc-bundle.js.map
