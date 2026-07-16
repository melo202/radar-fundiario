// D-4 — captura por VOZ (Web Speech): a voz só PREENCHE o texto; interpretar e
// confirmar continuam manuais. Contratos por asserção de string (código de cliente).
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const js = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
const html = readFileSync(new URL("../motor/os.html", import.meta.url), "utf-8");

test("D-4: Web Speech com fallback digno — sem suporte, o botão nem aparece", () => {
  assert.ok(js.includes("window.SpeechRecognition||window.webkitSpeechRecognition"));
  assert.ok(html.includes('id="voiceToggle" hidden'), "escondido por padrão no HTML");
  assert.match(js, /if\(SR\)\{const b=\$\("voiceToggle"\);b\.hidden=false/, "só aparece quando o navegador suporta");
  assert.ok(js.includes('rec.lang="pt-BR"'));
});

test("D-4: a voz NUNCA salva nem interpreta sozinha — só preenche o textarea", () => {
  const onresult = js.slice(js.indexOf("rec.onresult"), js.indexOf("rec.onerror"));
  assert.ok(onresult.includes('$("captureText")'), "resultado final vai para o texto");
  assert.ok(!/interpretCapture|confirmCapture|api\(/.test(onresult), "nenhuma chamada de rede ou ação a partir da fala");
  assert.ok(html.includes("Nada será salvo antes da sua confirmação — nem falando, nem digitando."));
});

test("D-4: microfone sob controle do corretor — para no fechar, para no interpretar, religa só enquanto ativo", () => {
  assert.ok(js.includes('$("captureDialog").addEventListener("close",vozParar)'), "fechar o diálogo desliga o microfone");
  assert.ok(js.includes("if(ouvindo)vozParar();const text="), "interpretar desliga o microfone antes");
  assert.match(js, /rec\.onend=\(\)=>\{if\(ouvindo\)\{try\{rec\.start\(\);\}/, "religa nas pausas do Chrome até o corretor mandar parar");
});

test("D-4: erro de microfone vira orientação, nunca beco sem saída", () => {
  assert.ok(js.includes("Microfone sem permissão — libere nas configurações do navegador"));
  assert.ok(js.includes("digite normalmente que funciona igual"), "a digitação segue como caminho sempre disponível");
});
