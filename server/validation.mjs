const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, max = 1000) => typeof v === 'string' && v.length <= max;
const number = (v, min = 0, max = 1e9) => Number.isFinite(v) && v >= min && v <= max;
const date = v => text(v, 10) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const unit = v => ['g', 'ml', 'pièce', 'càc', 'càs'].includes(v);
const brand = v => v === undefined || text(v, 200);
const optional = (v, valid) => v === undefined || valid(v);
export function validData(d) {
  if (!object(d) || !Array.isArray(d.recipes) || d.recipes.length > 5000 ||
      !Array.isArray(d.plans) || d.plans.length > 50000 ||
      !Array.isArray(d.receipts) || d.receipts.length > 10000 ||
      !Array.isArray(d.extras) || !object(d.checked) || !object(d.prices) || !number(d.budget)) return false;
  const ids = new Set();
  for (const r of d.recipes) {
    if (!object(r) || !text(r.id, 100) || ids.has(r.id) || !text(r.name, 300) || !r.name.trim() ||
        !text(r.description, 2000) || !['Végétarien', 'Poisson', 'Viande'].includes(r.type) ||
        !Array.isArray(r.months) || !r.months.length || !r.months.every(m => Number.isInteger(m) && m >= 1 && m <= 12) ||
        !number(r.servings, 1, 40) || !number(r.minutes, 1, 600) || !optional(r.cookingMinutes, v => number(v, 0, 1440)) ||
        !text(r.utensils, 300) || !text(r.emoji, 30) || !/^#[a-f\d]{6}$/i.test(r.color) ||
        typeof r.favorite !== 'boolean' || !text(r.steps, 20000) ||
        !Array.isArray(r.ingredients) || !r.ingredients.length || r.ingredients.length > 200) return false;
    ids.add(r.id);
    const ingredientIds = new Set();
    for (const i of r.ingredients) {
      if (!object(i) || !text(i.name, 300) || !i.name.trim() || !unit(i.unit) || !number(i.qty, .001) ||
          !number(i.price) || !text(i.category, 100) || !optional(i.id, v => text(v, 100)) || !brand(i.brand)) return false;
      if (i.id !== undefined) { if (ingredientIds.has(i.id)) return false; ingredientIds.add(i.id); }
    }
  }
  if (!d.plans.every(p => object(p) && text(p.id, 100) && date(p.date) && ids.has(p.recipeId) && number(p.servings, 1, 40) &&
      optional(p.meal, v => ['breakfast', 'lunch', 'dinner'].includes(v)) &&
      optional(p.ingredientIds, v => Array.isArray(v) && v.length <= 200 && v.every(id => text(id, 100))))) return false;
  if (!d.receipts.every(r => object(r) && text(r.id, 100) && date(r.date) && text(r.store, 300) && number(r.total) && text(r.notes, 10000) &&
      Array.isArray(r.lines) && r.lines.length <= 500 && r.lines.every(l => object(l) && text(l.name, 300) && number(l.qty, .001) && unit(l.unit) && number(l.total) && brand(l.brand)) &&
      (!r.file || (object(r.file) && text(r.file.key, 300) && text(r.file.name, 500))))) return false;
  if (!optional(d.foods, foods => Array.isArray(foods) && foods.length <= 10000 && foods.every(f => object(f) && text(f.id, 100) &&
      text(f.name, 300) && f.name.trim() && unit(f.unit) && text(f.category, 100) && brand(f.brand)))) return false;
  if (!optional(d.priceHistory, history => Array.isArray(history) && history.length <= 50000 && history.every(p => object(p) && text(p.id, 500) &&
      text(p.name, 300) && p.name.trim() && unit(p.unit) && number(p.price) && date(p.date) && ['manual', 'receipt', 'legacy'].includes(p.source) &&
      brand(p.brand) && optional(p.receiptId, v => text(v, 100)) && optional(p.recordedAt, v => text(v, 40) && !Number.isNaN(Date.parse(v)))))) return false;
  return d.extras.every(e => object(e) && text(e.id, 150) && text(e.name, 300) && number(e.qty, .001) && unit(e.unit) && number(e.price)) &&
      Object.entries(d.checked).every(([k, v]) => text(k, 700) && typeof v === 'boolean') &&
      Object.entries(d.prices).every(([k, v]) => text(k, 700) && object(v) && number(v.price) && date(v.date));
}
