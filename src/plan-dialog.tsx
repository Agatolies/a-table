import {useState} from 'react';
import {ArrowRight,Check,ShoppingBasket} from 'lucide-react';
import {Data,Plan,Meal,MEALS,ingredientId,money,priceOf} from './model';
const uid=()=>crypto.randomUUID?.()??Date.now().toString(36)+Math.random().toString(36).slice(2);
export default function PlanDialog({data,recipeId:initialRecipe,date:initialDate,meal:initialMeal,plan,onSave}:{data:Data;recipeId:string;date:string;meal:Meal;plan:Plan|null;onSave:(p:Plan)=>void}){
 const [recipeId,setRecipeId]=useState(plan?.recipeId??initialRecipe),[date,setDate]=useState(plan?.date??initialDate),[meal,setMeal]=useState<Meal>(plan?.meal??initialMeal),[portions,setPortions]=useState(plan?.servings??2);
 const initial=data.recipes.find(r=>r.id===(plan?.recipeId??initialRecipe));
 const [ids,setIds]=useState<string[]>(plan?.ingredientIds??initial?.ingredients.map((i,j)=>ingredientId(initial,i,j))??[]);
 const recipe=data.recipes.find(r=>r.id===recipeId);
 const occupied=data.plans.find(p=>p.id!==plan?.id&&p.date===date&&(p.meal??'dinner')===meal);
 const selected=recipe?.ingredients.filter((i,j)=>ids.includes(ingredientId(recipe,i,j)))??[];
 const cost=recipe?selected.reduce((sum,i)=>sum+i.qty*portions/recipe.servings*priceOf(i,data),0):0;
 return <form onSubmit={e=>{e.preventDefault();if(!recipe)return;onSave({id:plan?.id??uid(),date,meal,recipeId,servings:portions,ingredientIds:ids})}}>
  <div className="eyebrow">UNE ENVIE, UNE PLACE DANS LA SEMAINE</div><h2>{plan?'Ajuster ce repas':'On la met au menu ?'}</h2>
  <label>Recette<select required value={recipeId} onChange={e=>{const r=data.recipes.find(r=>r.id===e.target.value);setRecipeId(e.target.value);setIds(r?.ingredients.map((i,j)=>ingredientId(r,i,j))??[])}}><option disabled value="choose">Choisir une recette</option>{data.recipes.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
  <div className="form-grid"><label>Jour<input type="date" required value={date} onInput={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)}/></label><label>Repas<select value={meal} onChange={e=>setMeal(e.target.value as Meal)}>{MEALS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label></div>
  <label>Portions pour ce repas<input required type="number" min="1" max="40" value={portions} onChange={e=>setPortions(+e.target.value)}/></label>
  {occupied&&<p className="slot-warning" role="status">Ce créneau contient déjà « {data.recipes.find(r=>r.id===occupied.recipeId)?.name} ». Le nouveau plat le remplacera.</p>}
  {recipe&&<section className="plan-ingredients"><div className="section-label"><h3><ShoppingBasket size={17}/>À ajouter aux courses</h3><span>{selected.length}/{recipe.ingredients.length} ingrédients</span></div><div className="selection-actions"><button type="button" className="secondary" onClick={()=>setIds(recipe.ingredients.map((i,j)=>ingredientId(recipe,i,j)))}><Check size={14}/>Tous</button><button type="button" className="secondary" onClick={()=>setIds([])}>Aucun</button></div>
   <div className="plan-selection">{recipe.ingredients.map((i,j)=>{const id=ingredientId(recipe,i,j);return <label key={id} className="plan-selection-row"><input type="checkbox" checked={ids.includes(id)} onChange={e=>setIds(e.target.checked?[...ids,id]:ids.filter(x=>x!==id))}/><span><strong>{i.name}{i.brand&&<small> · {i.brand}</small>}</strong><small>{new Intl.NumberFormat('fr-BE',{maximumFractionDigits:2}).format(i.qty*portions/recipe.servings)} {i.unit}</small></span><span>{money(i.qty*portions/recipe.servings*priceOf(i,data))}</span></label>})}</div>
   <p className="form-help">Seuls les ingrédients cochés seront ajoutés à la liste, avec les quantités adaptées aux portions. Vous pourrez revenir modifier cette sélection depuis le menu.</p><p className="selected-total">Ajout estimé aux courses : <strong>{money(cost)}</strong></p></section>}
  <div className="modal-actions"><button className="primary" type="submit" disabled={!recipe}>{occupied?'Remplacer le plat':plan?'Enregistrer le repas':'Ajouter au menu'}<ArrowRight size={16}/></button></div>
 </form>
}
