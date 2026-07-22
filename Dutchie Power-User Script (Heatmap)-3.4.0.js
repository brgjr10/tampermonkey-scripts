// ==UserScript==
// @name         Dutchie Power-User Script (Heatmap)
// @namespace    https://tampermonkey.net/
// @version      3.4.0
// @description  Hide unwanted items, brand filters, $/g labels, gradient price heatmap, optional $/g sorting
// @match        https://dutchie.com/stores/*
// @run-at       document-end
// ==/UserScript==

(function () {
'use strict';

/**********************
CONFIG
**********************/
const BLOCKED_KEYWORDS = [
'RSO','FSO','Riv Stick','Pre Roll','PreRoll','Infused','Kief','Moon Rock','Space Rock'
].map(k=>k.toLowerCase());

const HIDE_KEY = 'tm_hide_products_enabled';
const SORT_KEY = 'tm_sort_enabled';

let hideEnabled = localStorage.getItem(HIDE_KEY) !== 'false';
let sortEnabled = localStorage.getItem(SORT_KEY) === 'true';
let currentBrandFilter = null;

/**********************
STYLES
**********************/
const style = document.createElement('style');
style.textContent = `
.tm-hidden{display:none!important;}

.tm-brand-buttons{
position:fixed;
bottom:12px;
right:12px;
z-index:99999;
background:#111;
color:#fff;
padding:6px 10px;
font-size:12px;
border-radius:6px;
opacity:.9;
display:flex;
gap:6px;
}

.tm-brand-buttons button{
padding:6px 10px;
background:#3498db;
border:none;
border-radius:4px;
cursor:pointer;
color:#fff;
}

.tm-brand-buttons button.active{
background:#2ecc71;
}

.tm-ppg-label{
position:absolute;
top:6px;
left:6px;
background:rgba(0,0,0,.75);
color:#fff;
font-size:11px;
padding:2px 6px;
border-radius:4px;
pointer-events:none;
z-index:5;
}
`;
document.head.appendChild(style);

/**********************
HELPERS
**********************/
function getText(item){
return item.textContent.replace(/\s+/g,' ');
}

function parsePricePerGram(item){

const options = item.querySelectorAll('button[data-testid="option-tile"]');

let lowest = null;

options.forEach(option=>{

const text = option.textContent.replace(/\s+/g,' ');

const gramMatch = text.match(/([\d.]+)\s*g/i);
const priceMatch = text.match(/\$([\d.]+)/);

if(gramMatch && priceMatch){

const grams = parseFloat(gramMatch[1]);
const price = parseFloat(priceMatch[1]);

if(grams && price){

const ppg = price / grams;

if(lowest === null || ppg < lowest)
lowest = ppg;

}

}

});

return lowest;

}

function setLabel(item,ppg){

let label = item.querySelector('.tm-ppg-label');

if(!label){

label = document.createElement('div');
label.className = 'tm-ppg-label';

item.style.position='relative';

item.appendChild(label);

}

label.textContent = `$${ppg.toFixed(2)}/g`;

}

function titleMatches(title){

const t = title.toLowerCase();

return BLOCKED_KEYWORDS.some(k=>t.includes(k));

}

/**********************
MAIN PROCESS
**********************/
function processProducts(){

const items = Array.from(document.querySelectorAll(
'div[data-testid="product-list-item"], div[data-testid="product-grid-item"]'
));

const deals=[];

items.forEach(item=>{

const title = getText(item);

const hideByKeyword = hideEnabled && titleMatches(title);

const hideByBrand =
currentBrandFilter &&
!title.toLowerCase().includes(currentBrandFilter.toLowerCase());

const shouldHide = hideByKeyword || hideByBrand;

item.classList.toggle('tm-hidden',shouldHide);

if(shouldHide) return;

const ppg = parsePricePerGram(item);

if(ppg===null) return;

setLabel(item,ppg);

deals.push({item,ppg});

});

if(deals.length===0) return;

/**********************
SORT
**********************/
deals.sort((a,b)=>a.ppg-b.ppg);

/**********************
HEATMAP COLORING
**********************/
const min = deals[0].ppg;
const max = deals[deals.length-1].ppg;

deals.forEach(d=>{

let ratio = (d.ppg - min) / (max - min || 1);

let r = Math.round(255 * ratio);
let g = Math.round(255 * (1 - ratio));

d.item.style.background =
`linear-gradient(180deg,
rgba(${r},${g},0,0.25),
rgba(${r},${g},0,0.06))`;

d.item.style.boxShadow =
`0 0 0 1px rgba(${r},${g},0,.15) inset,
0 8px 24px rgba(0,0,0,.25),
0 0 20px rgba(${r},${g},0,.25)`;

});

/**********************
OPTIONAL SORT
**********************/
if(sortEnabled){

const parent = deals[0].item.parentElement;

deals.forEach(d=>parent.appendChild(d.item));

}

updateButtons();

}

/**********************
BUTTONS
**********************/
let container;

function createButtons(){

container=document.createElement('div');
container.className='tm-brand-buttons';

const hideBtn=document.createElement('button');
hideBtn.dataset.type='hide';

hideBtn.onclick=()=>{

hideEnabled=!hideEnabled;

localStorage.setItem(HIDE_KEY,hideEnabled);

processProducts();

};

container.appendChild(hideBtn);

const sortBtn=document.createElement('button');
sortBtn.dataset.type='sort';

sortBtn.onclick=()=>{

sortEnabled=!sortEnabled;

localStorage.setItem(SORT_KEY,sortEnabled);

processProducts();

};

container.appendChild(sortBtn);

['Rove','Luster'].forEach(brand=>{

const btn=document.createElement('button');

btn.textContent=brand;

btn.dataset.brand=brand;

btn.onclick=()=>{

currentBrandFilter =
currentBrandFilter===brand ? null : brand;

processProducts();

};

container.appendChild(btn);

});

document.body.appendChild(container);

updateButtons();

}

function updateButtons(){

container.querySelectorAll('button').forEach(btn=>{

if(btn.dataset.type==='hide'){

btn.textContent =
hideEnabled ? 'Hide: ON' : 'Hide: OFF';

btn.classList.toggle('active',hideEnabled);

}

if(btn.dataset.type==='sort'){

btn.textContent =
sortEnabled ? 'Sort: ON' : 'Sort: OFF';

btn.classList.toggle('active',sortEnabled);

}

if(btn.dataset.brand){

btn.classList.toggle(
'active',
currentBrandFilter===btn.dataset.brand
);

}

});

}

/**********************
OBSERVER
**********************/
let scheduled=false;

function schedule(){

if(scheduled) return;

scheduled=true;

requestAnimationFrame(()=>{

scheduled=false;

processProducts();

});

}

function init(){

createButtons();

processProducts();

const observer=new MutationObserver(schedule);

observer.observe(document.body,{
childList:true,
subtree:true
});

}

if(document.readyState==='loading'){

document.addEventListener('DOMContentLoaded',init);

}else{

init();

}

})();