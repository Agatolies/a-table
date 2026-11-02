import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,normalizeData,shopping,key,priceOf,cost,withHistory,withReceipt,historyFor,catalog} from '../src/model.ts';
import {validData} from '../server/validation.mjs';
const point=(patch={})=>({id:'p1',name:'Huile',unit:'ml',price:.01,date:'2026-11-01',source:'manual',...patch});
test('three meals respect all, no and custom shopping selections',()=>{
 const d=initialData(),r=d.recipes[0];
 d.plans=[{id:'b',date:'2026-11-02',meal:'breakfast',recipeId:r.id,servings:2,ingredientIds:[]},{id:'l',date:'2026-11-02',meal:'lunch',recipeId:r.id,servings:4,ingredientIds:[r.ingredients[1].id]},{id:'d',date:'2026-11-02',meal:'dinner',recipeId:r.id,servings:2,ingredientIds:r.ingredients.map(i=>i.id)}];
 const basket=shopping(d,'2026-11-02');assert.equal(basket.find(([,i])=>i.name==='Poireaux')[1].qty,900);assert.equal(basket.find(([,i])=>i.name==='Hauts de cuisses de poulet')[1].qty,300);
 r.ingredients.reverse();assert.equal(shopping(d,'2026-11-02').find(([,i])=>i.name==='Poireaux')[1].qty,900);
 assert.equal(validData(d),true);
});
test('teaspoons and tablespoons share volume prices and shopping quantities',()=>{
 let d=initialData();d.recipes[0].ingredients=[{id:'a',name:'Huile',brand:'A',qty:2,unit:'càc',price:.05,category:'Épicerie'},{id:'b',name:'Huile',brand:'A',qty:1,unit:'càs',price:.15,category:'Épicerie'},{id:'c',name:'Huile',brand:'B',qty:10,unit:'ml',price:.02,category:'Épicerie'}];
 d=withHistory(d,[point({brand:'A'})]);assert.equal(priceOf(d.recipes[0].ingredients[0],d),.05);assert.equal(priceOf(d.recipes[0].ingredients[1],d),.15);assert.ok(Math.abs(cost(d.recipes[0],d)-.45)<1e-9);
 d.plans=[{id:'1',date:'2026-11-02',meal:'dinner',recipeId:d.recipes[0].id,servings:4}];const basket=shopping(d,'2026-11-02');assert.equal(basket.length,2);assert.equal(basket.find(([,i])=>i.brand==='A')[1].qty,25);assert.equal(basket.find(([,i])=>i.brand==='B')[1].qty,10);assert.notEqual(key('Huile','g','A'),key('Huile','ml','A'));
});
test('latest dated price wins, with distinct brands and chronological history',()=>{
 let d=initialData();d=withHistory(d,[point({id:'new',date:'2026-11-03',price:.015}),point({id:'old',date:'2026-11-01',price:.01}),point({id:'brand',date:'2026-11-04',brand:'Autre',price:.02})]);
 assert.equal(priceOf({name:'Huile',unit:'ml',price:0},d),.015);assert.equal(priceOf({name:'Huile',unit:'ml',brand:'Autre',price:0},d),.02);assert.deepEqual(historyFor(d,'Huile','ml').map(p=>p.id),['old','new']);
 d=withHistory(d,d.priceHistory.filter(p=>p.id!=='new'));assert.equal(priceOf({name:'Huile',unit:'ml',price:0},d),.01);
});
test('saving or correcting receipt lines updates history without duplicate observations',()=>{
 let d=initialData();const receipt={id:'r1',date:'2026-11-02',store:'Test',total:3,notes:'',lines:[{name:'Huile',brand:'A',qty:1000,unit:'ml',total:3}]};
 d=withReceipt(d,receipt);d=withReceipt(d,receipt);assert.equal(d.priceHistory.length,1);assert.equal(d.prices[key('Huile','ml','A')].price,.003);
 d=withReceipt(d,{...receipt,lines:[{...receipt.lines[0],total:4}]});assert.equal(d.priceHistory.length,1);assert.equal(d.priceHistory[0].price,.004);assert.ok(catalog(d).some(f=>f.name==='Huile'&&f.brand==='A'));assert.equal(validData(d),true);
});
test('legacy notebooks preserve meals, shopping, prices and unknown cooking times',()=>{
 const legacy=initialData();delete legacy.foods;delete legacy.priceHistory;delete legacy.recipes[0].cookingMinutes;legacy.recipes.forEach(r=>r.ingredients.forEach(i=>{delete i.id;delete i.brand}));legacy.plans=[{id:'old',date:'2026-11-02',recipeId:legacy.recipes[0].id,servings:4}];legacy.prices[key('Poireaux','g')]={price:.004,date:'2026-10-30'};
 const d=normalizeData(legacy);assert.equal(d.plans[0].meal,'dinner');assert.equal(d.plans[0].ingredientIds,undefined);assert.equal(d.recipes[0].cookingMinutes,undefined);assert.equal(shopping(d,'2026-11-02').length,5);assert.equal(d.priceHistory.length,1);assert.equal(priceOf(d.recipes[0].ingredients[1],d),.004);assert.equal(validData(d),true);assert.deepEqual(normalizeData(d),d);
});
test('new field validation rejects bad meals, units, cooking time and prices',()=>{
 const d=initialData();d.plans=[{id:'1',date:'2026-11-02',recipeId:d.recipes[0].id,servings:2,meal:'breakfast',ingredientIds:[]}];assert.equal(validData(d),true);
 for(const mutate of [x=>x.plans[0].meal='snack',x=>x.plans[0].ingredientIds='all',x=>x.recipes[0].cookingMinutes=-1,x=>x.recipes[0].ingredients[0].unit='kg',x=>x.recipes[0].ingredients[0].brand=42,x=>x.priceHistory=[point({price:-1})]]){const invalid=structuredClone(d);mutate(invalid);assert.equal(validData(invalid),false)}
});
test('standalone foods configure the price of extra shopping items',()=>{
 let d=withHistory(initialData(),[point({name:'Pain',unit:'pièce',price:2.3})]);d.extras=[{id:'2026-11-02-extra',name:'Pain',qty:2,unit:'pièce',price:0}];
 assert.equal(shopping(d,'2026-11-02')[0][1].price,2.3);assert.equal(catalog(d).find(f=>f.name==='Pain').unit,'pièce');
});
