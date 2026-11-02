const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max=1000)=>typeof v==='string'&&v.length<=max;
const number=(v,min=0,max=1e9)=>Number.isFinite(v)&&v>=min&&v<=max;
const date=v=>text(v,10)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v));
const unit=v=>['g','ml','pièce'].includes(v);
export function validData(d){
 if(!object(d)||!Array.isArray(d.recipes)||d.recipes.length>5000||!Array.isArray(d.plans)||d.plans.length>50000||!Array.isArray(d.receipts)||d.receipts.length>10000||!Array.isArray(d.extras)||!object(d.checked)||!object(d.prices)||!number(d.budget))return false;
 const ids=new Set();
 for(const r of d.recipes){if(!object(r)||!text(r.id,100)||ids.has(r.id)||!text(r.name,300)||!r.name.trim()||!text(r.description,2000)||!['Végétarien','Poisson','Viande'].includes(r.type)||!Array.isArray(r.months)||!r.months.length||!r.months.every(m=>Number.isInteger(m)&&m>=1&&m<=12)||!number(r.servings,1,40)||!number(r.minutes,1,600)||!text(r.utensils,300)||!text(r.emoji,30)||!/^#[a-f\d]{6}$/i.test(r.color)||typeof r.favorite!=='boolean'||!text(r.steps,20000)||!Array.isArray(r.ingredients)||!r.ingredients.length||r.ingredients.length>200)return false;ids.add(r.id);for(const i of r.ingredients)if(!object(i)||!text(i.name,300)||!i.name.trim()||!unit(i.unit)||!number(i.qty,.001)||!number(i.price)||!text(i.category,100))return false;}
 if(!d.plans.every(p=>object(p)&&text(p.id,100)&&date(p.date)&&ids.has(p.recipeId)&&number(p.servings,1,40)))return false;
 if(!d.receipts.every(r=>object(r)&&text(r.id,100)&&date(r.date)&&text(r.store,300)&&number(r.total)&&text(r.notes,10000)&&Array.isArray(r.lines)&&r.lines.length<=500&&r.lines.every(l=>object(l)&&text(l.name,300)&&number(l.qty,.001)&&unit(l.unit)&&number(l.total))&&(!r.file||(object(r.file)&&text(r.file.key,300)&&text(r.file.name,500)))))return false;
 return d.extras.every(e=>object(e)&&text(e.id,150)&&text(e.name,300)&&number(e.qty,.001)&&unit(e.unit)&&number(e.price))&&Object.entries(d.checked).every(([k,v])=>text(k,500)&&typeof v==='boolean')&&Object.entries(d.prices).every(([k,v])=>text(k,500)&&object(v)&&number(v.price)&&date(v.date));
}
