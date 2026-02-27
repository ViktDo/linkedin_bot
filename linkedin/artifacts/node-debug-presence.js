// Debug code node — Pre-check before Score Engine
// Цель: логировать presence flags для выявления нестабильного INSUFFICIENT_DATA
// Размещение в n8n: Code node перед "Message a model1" (Score Engine)
//
// Проблема, которую решает:
// "Через раз с теми же данными уходит в INSUFFICIENT_DATA"
// Причина: разные items / ветки workflow → в одном вызове experience пуст, в другом заполнен

const p = {
  goal_type: ($json.goal_type ?? '').toString(),
  result_lang: ($json.result_lang ?? '').toString(),
  normalized_profile: $json.normalized_profile ?? null,
};

const np = p.normalized_profile || {};
return [{
  json: {
    payload_to_llm: p,
    debug_presence: {
      headline_present: !!(np.headline && String(np.headline).trim()),
      about_present: !!(np.about && String(np.about).trim()),
      experience_is_array: Array.isArray(np.experience),
      experience_len: Array.isArray(np.experience) ? np.experience.length : null,
      skills_len: Array.isArray(np.skills) ? np.skills.length : null,
    }
  }
}];
