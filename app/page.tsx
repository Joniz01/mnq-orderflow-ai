'use client';

import { useState, useEffect } from 'react';

const SYSTEM_PROMPT = `Eres MNQ Order Flow Analyst, un trader experimentado que opera MNQ. 
Analiza las imágenes que se te envían (pueden ser 1 o 2). 
La primera imagen es Order Flow. La segunda (si existe) es GEXBOT / Niveles.
Responde SIEMPRE en español, siguiendo EXACTAMENTE esta estructura:

1. **Sincronización de Timestamps**
   - Hora en la imagen (precio): [extrae exactamente]
   - Hora actual del análisis: [actual]

2. **Resumen General del Mercado** (máximo 2 frases)

3. **Análisis Order Flow** (detallado)

4. **Análisis GEXBOT Nivel 3** (si se envió la segunda imagen)

5. **Confluencia y Bias Integrado**

6. **Setup Recomendado**
   - Entrada:
   - Stop Loss: (nunca mayor a 40 puntos)
   - Target 1:
   - Target 2:
   - Probabilidad estimada: XX% (solo si ≥ 75%)

7. **Riesgos clave**

Reglas obligatorias:
- Stop Loss nunca mayor a 40 puntos.
- Solo proponer setup si confluencia ≥ 75%. Si no, di claramente 'Sin setup de alta probabilidad en este momento'.
- Saluda con: '✅ MNQ Order Flow Analyst listo.'
- Termina con: '¿Quieres que profundice en algún nivel o analice otra imagen?'`;

export default function OrderFlowAnalyzer() {
  const [provider, setProvider] = useState<'gemini' | 'grok'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash'); // ← Modelo recomendado por defecto

  const [orderFlow, setOrderFlow] = useState<string>('');
  const [gexbot, setGexbot] = useState<string>('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('of_ai_settings');
    if (saved) {
      const s = JSON.parse(saved);
      setProvider(s.provider || 'gemini');
      setApiKey(s.apiKey || '');
      setModel(s.model || 'gemini-2.5-flash');
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('of_ai_settings', JSON.stringify({ provider, apiKey, model }));
    alert('✅ Configuración guardada');
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>, isOrderFlow: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string)?.split(',')[1] || '';
      if (isOrderFlow) setOrderFlow(base64);
      else setGexbot(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!apiKey) return alert('❌ Ingresa tu API Key');
    if (!orderFlow) return alert('❌ Sube al menos la imagen de Order Flow');

    setLoading(true);
    setAnalysis('');

    try {
      const modelName = model.trim();
      let url = '';
      let headers: any = { 'Content-Type': 'application/json' };
      let body: any;

      if (provider === 'gemini') {
        const parts = [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: 'image/png', data: orderFlow } }
        ];
        if (gexbot) parts.push({ inline_data: { mime_type: 'image/png', data: gexbot } });

        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
        body = { contents: [{ parts }] };
      } else {
        // Grok
        const content = [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${orderFlow}` } }
        ];
        if (gexbot) content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${gexbot}` } });

        url = 'https://api.x.ai/v1/chat/completions';
        headers.Authorization = `Bearer ${apiKey.trim()}`;
        body = {
          model: modelName || 'grok-2-vision-1212',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }],
          max_tokens: 3000
        };
      }

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Error ${res.status}: ${err.substring(0, 300)}`);
      }

      const data = await res.json();
      const text = provider === 'gemini' 
        ? data.candidates?.[0]?.content?.parts?.[0]?.text 
        : data.choices?.[0]?.message?.content;

      setAnalysis(text || 'No se recibió respuesta.');
    } catch (err: any) {
      setAnalysis(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-lime-400 mb-2">🚀 MNQ Order Flow AI Analyst</h1>
        <p className="text-zinc-400">Versión flexible - Gemini 2.5 Flash recomendado</p>

        {/* Configuración */}
        <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-xl mb-4">⚙️ Configuración</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Proveedor</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value as 'gemini' | 'grok')} className="w-full bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                <option value="gemini
