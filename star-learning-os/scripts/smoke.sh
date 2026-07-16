#!/usr/bin/env bash
# Smoke test E2E del corte vertical contra la API local (puerto 4000).
# Ejercita el recorrido completo del alumno y los gates juveniles críticos.
set -u
API="http://localhost:4000/v1"
TMP="${TMPDIR:-/tmp}/star-smoke"
mkdir -p "$TMP"
PASS=0; FAIL=0

check() { # check <nombre> <esperado> <obtenido>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1  (esperado=$2 obtenido=$3)"; fi
}

jsonget() { # jsonget <archivo> <expresión python sobre d>
  python -c "import json,sys; d=json.load(open(sys.argv[1],encoding='utf-8')); print(eval(sys.argv[2]))" "$1" "$3" 2>/dev/null || echo "__ERROR__"
}

req() { # req <cookiejar> <método> <ruta> [json] -> guarda cuerpo en $TMP/last.json, imprime status
  local jar="$1" method="$2" path="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -s -o "$TMP/last.json" -w "%{http_code}" -X "$method" -b "$jar" -c "$jar" \
      -H "Content-Type: application/json" -d "$body" "$API$path"
  else
    curl -s -o "$TMP/last.json" -w "%{http_code}" -X "$method" -b "$jar" -c "$jar" "$API$path"
  fi
}

field() { jsonget "$TMP/last.json" x "$1"; }

echo "=== 0. Onboarding completo: registro → invitación → vínculo → permisos → asentimiento ==="
TS=$(date +%s)
NICO="$TMP/nico.jar"; rm -f "$NICO"
check "registro alumno con age gate (14 años)" 201 "$(req "$NICO" POST /auth/register-learner "{\"displayName\":\"Nico Prueba\",\"email\":\"nico-$TS@demo.pe\",\"birthYear\":2012}")"
check "menor de 12 rechazado" 403 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"displayName\":\"Peque\",\"email\":\"peque-$TS@demo.pe\",\"birthYear\":2020}" "$API/auth/register-learner")"
check "inscripción bloqueada sin apoderado" 403 "$(req "$NICO" POST /enrollments '{"programCode":"english-path"}')"
check "crear invitación al apoderado" 201 "$(req "$NICO" POST /family-invitations "{\"guardianEmail\":\"madre-$TS@demo.pe\"}")"
ICODE=$(field "d['code']")
PADRE="$TMP/padre.jar"; rm -f "$PADRE"
check "registro apoderado" 201 "$(req "$PADRE" POST /auth/register-guardian "{\"displayName\":\"Madre Prueba\",\"email\":\"madre-$TS@demo.pe\"}")"
check "aceptar invitación con código" 201 "$(req "$PADRE" POST /family-invitations/accept "{\"code\":\"$ICODE\"}")"
NICOID=$(req "$NICO" GET /auth/me >/dev/null; field "d['id']")
check "apoderado otorga consentimientos" 201 "$(req "$PADRE" POST /consents "{\"learnerId\":\"$NICOID\",\"purposes\":[\"service\",\"ai_voice\"]}")"
check "asentimiento del alumno" 201 "$(req "$NICO" POST /assents '{}')"
check "onboarding listo para inscribir" "True" "$(req "$NICO" GET /onboarding/status >/dev/null; field "d['readyToEnroll']")"
check "ahora sí puede inscribirse" 201 "$(req "$NICO" POST /enrollments '{"programCode":"english-path"}')"
NICOENR=$(field "d['id']")
check "revocar voz con IA (apoderado)" 201 "$(req "$PADRE" POST /consents/revoke "{\"learnerId\":\"$NICOID\",\"purpose\":\"ai_voice\"}")"

echo "=== 0b. StarMap multietapa: router → módulo → writing (§7.2) ==="
req "$NICO" POST "/enrollments/$NICOENR/diagnostic-attempts" >/dev/null
NATT=$(field "d['id']")
check "etapa 1: router" router "$(req "$NICO" GET "/diagnostic-attempts/$NATT/next-items" >/dev/null; field "d['stage']")"
RCODES=$(jsonget "$TMP/last.json" x "' '.join(i['code'] for i in d['items'])")
for c in $RCODES; do req "$NICO" POST "/diagnostic-attempts/$NATT/responses" "{\"itemCode\":\"$c\",\"selectedIndex\":1}" >/dev/null; done
check "etapa 2: módulo ajustado al nivel" module "$(req "$NICO" GET "/diagnostic-attempts/$NATT/next-items" >/dev/null; field "d['stage']")"
MCODES=$(jsonget "$TMP/last.json" x "' '.join(i['code'] for i in d['items'])")
for c in $MCODES; do req "$NICO" POST "/diagnostic-attempts/$NATT/responses" "{\"itemCode\":\"$c\",\"selectedIndex\":1}" >/dev/null; done
check "etapa 3: writing" writing "$(req "$NICO" GET "/diagnostic-attempts/$NATT/next-items" >/dev/null; field "d['stage']")"
WCODE=$(jsonget "$TMP/last.json" x "d['items'][0]['code']")
check "enviar muestra de writing" 201 "$(req "$NICO" POST "/diagnostic-attempts/$NATT/writing" "{\"itemCode\":\"$WCODE\",\"text\":\"My name is Nico and I am fourteen years old. I want to improve my English because I plan to study engineering at university and I will need it to read technical papers and to talk with classmates from other countries about our projects.\"}")"
check "completar diagnóstico multietapa" 201 "$(req "$NICO" POST "/diagnostic-attempts/$NATT/complete")"
check "perfil incluye writing" "True" "$(jsonget "$TMP/last.json" x "'writing' in d['placement']['perSkill']")"
check "preview público sin sesión" 200 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" "$API/preview/items")"

echo "=== 1. Diego (14-17): login, inscripción y diagnóstico ==="
DIEGO="$TMP/diego.jar"; rm -f "$DIEGO"
check "login Diego" 201 "$(req "$DIEGO" POST /auth/dev-login '{"profile":"learner_teen"}')"
# Sin paceCode: la Metodología §7.5 elige el ritmo DESPUÉS del diagnóstico.
STATUS=$(req "$DIEGO" POST /enrollments '{"programCode":"english-path"}')
if [ "$STATUS" = "409" ]; then
  req "$DIEGO" GET /enrollments >/dev/null
  ENR=$(jsonget "$TMP/last.json" x "d[0]['id']")
  echo "INFO  inscripción ya existía (idempotencia OK): $ENR"
else
  check "crear inscripción" 201 "$STATUS"
  ENR=$(field "d['id']")
fi
echo "INFO  enrollment=$ENR"

ESTADO=$(req "$DIEGO" GET "/enrollments/$ENR" >/dev/null; field "d['status']")
if [ "$ESTADO" = "pending_diagnostic" ]; then
  check "crear intento diagnóstico" 201 "$(req "$DIEGO" POST "/enrollments/$ENR/diagnostic-attempts")"
  ATT=$(field "d['id']")
  # Perfil B1: reading 3/4, listening 3/4, language_use 2/4
  answer() { req "$DIEGO" POST "/diagnostic-attempts/$ATT/responses" "{\"itemCode\":\"$1\",\"selectedIndex\":$2}" >/dev/null; }
  answer DIAG-RD-01 0; answer DIAG-RD-02 1; answer DIAG-RD-03 1; answer DIAG-RD-04 3
  answer DIAG-LIS-01 1; answer DIAG-LIS-02 2; answer DIAG-LIS-03 0; answer DIAG-LIS-04 0
  answer DIAG-LU-01 1;  answer DIAG-LU-02 2;  answer DIAG-LU-03 0;  answer DIAG-LU-04 0
  check "completar diagnóstico" 201 "$(req "$DIEGO" POST "/diagnostic-attempts/$ATT/complete")"
  check "placement provisional (menor)" "True" "$(field "d['placement']['provisional']")"
  check "nivel general B1" B1 "$(field "d['placement']['overall']")"
  check "ritmo pendiente tras diagnóstico (§7.5)" "False" "$(field "d['paceConfirmed']")"
  check "siguiente acción: elegir ritmo" choose_pace "$(field "d['nextAction']['type']")"
else
  echo "INFO  diagnóstico ya completado antes"
fi

echo "=== 1b. Selector de ritmo con proyección (Metodología §7.5 y §9.3) ==="
check "opciones de ritmo" 200 "$(req "$DIEGO" GET "/enrollments/$ENR/pace-options")"
check "nivel de entrada B1" B1 "$(field "d['entryLevel']")"
check "Accelerated proyecta 5-8 meses" "5-8" "$(jsonget "$TMP/last.json" x "str([o for o in d['options'] if o['code']=='accelerated'][0]['monthsMin'])+'-'+str([o for o in d['options'] if o['code']=='accelerated'][0]['monthsMax'])")"
check "confirmar ritmo Accelerated" 200 "$(req "$DIEGO" PATCH "/enrollments/$ENR/pace" '{"paceCode":"accelerated"}')"
check "ritmo confirmado" "True" "$(field "d['paceConfirmed']")"

echo "=== 2. Plan del día y lección ==="
check "GET today" 200 "$(req "$DIEGO" GET "/enrollments/$ENR/today")"
LESSON=$(jsonget "$TMP/last.json" x "[b for b in d['blocks'] if b['kind']=='lesson'][0]['lessonContractId']")
check "today trae lección" 36 "${#LESSON}"
check "crear sesión" 201 "$(req "$DIEGO" POST "/enrollments/$ENR/sessions" "{\"lessonContractId\":\"$LESSON\"}")"
SES=$(field "d['id']")
ACT=$(jsonget "$TMP/last.json" x "d['activities'][0]['id']")
NOKEY=$(jsonget "$TMP/last.json" x "'answerKey' in json.dumps(d)")
check "cliente sin claves de respuesta" "False" "$NOKEY"
check "responder mcq correcta" 201 "$(req "$DIEGO" POST "/sessions/$SES/activities/$ACT/submissions" '{"response":{"kind":"mcq","selectedIndex":1},"usedAids":false}')"
check "evidencia con score 1" "1" "$(jsonget "$TMP/last.json" x "int(d['score'])")"
check "estado en desarrollo" developing "$(field "d['competencyState']")"

echo "=== 3. Voz: Diego permitido (mock), Lucía bloqueada por ZDR ==="
req "$DIEGO" GET "/enrollments/$ENR/today" >/dev/null
VLESSON=$(jsonget "$TMP/last.json" x "[b for b in d['blocks'] if b['kind']=='voice_mission'][0]['lessonContractId']")
check "crear sesión de voz Diego" 201 "$(req "$DIEGO" POST "/enrollments/$ENR/voice-sessions" "{\"lessonContractId\":\"$VLESSON\"}")"
check "modo mock sin API key" mock "$(field "d['mode']")"
VS=$(field "d['voiceSessionId']")
check "heartbeat" 201 "$(req "$DIEGO" POST "/voice-sessions/$VS/heartbeat" '{"activeSecondsDelta":30}')"
check "cerrar sesión de voz" 201 "$(req "$DIEGO" POST "/voice-sessions/$VS/end" '{"activeSeconds":60,"reason":"completed"}')"

LUCIA="$TMP/lucia.jar"; rm -f "$LUCIA"
check "login Lucía (12-13)" 201 "$(req "$LUCIA" POST /auth/dev-login '{"profile":"learner_young"}')"
LSTATUS=$(req "$LUCIA" POST /enrollments '{"programCode":"english-path"}')
if [ "$LSTATUS" = "409" ]; then req "$LUCIA" GET /enrollments >/dev/null; LENR=$(jsonget "$TMP/last.json" x "d[0]['id']"); else LENR=$(field "d['id']"); fi
# Activamos su inscripción completando el diagnóstico, para aislar el gate ZDR:
LESTADO=$(req "$LUCIA" GET "/enrollments/$LENR" >/dev/null; field "d['status']")
if [ "$LESTADO" = "pending_diagnostic" ]; then
  req "$LUCIA" POST "/enrollments/$LENR/diagnostic-attempts" >/dev/null
  LATT=$(field "d['id']")
  lanswer() { req "$LUCIA" POST "/diagnostic-attempts/$LATT/responses" "{\"itemCode\":\"$1\",\"selectedIndex\":$2}" >/dev/null; }
  lanswer DIAG-RD-01 0; lanswer DIAG-RD-02 1; lanswer DIAG-RD-03 0; lanswer DIAG-RD-04 0
  lanswer DIAG-LIS-01 1; lanswer DIAG-LIS-02 0; lanswer DIAG-LIS-03 0; lanswer DIAG-LIS-04 1
  lanswer DIAG-LU-01 1;  lanswer DIAG-LU-02 0;  lanswer DIAG-LU-03 1;  lanswer DIAG-LU-04 0
  req "$LUCIA" POST "/diagnostic-attempts/$LATT/complete" >/dev/null
fi
ZCODE=$(req "$LUCIA" POST "/enrollments/$LENR/voice-sessions" "{\"lessonContractId\":\"$VLESSON\"}")
ZREASON=$(field "d['error']['code']")
check "voz Lucía denegada (403)" 403 "$ZCODE"
check "motivo exacto: ZDR_REQUIRED (gate D17)" ZDR_REQUIRED "$ZREASON"

echo "=== 4. Apoderada y staff ==="
ANA="$TMP/ana.jar"; rm -f "$ANA"
check "login Ana" 201 "$(req "$ANA" POST /auth/dev-login '{"profile":"guardian"}')"
check "resumen familiar" 200 "$(req "$ANA" GET /guardian/learners)"
NLEARNERS=$(jsonget "$TMP/last.json" x "len(d['learners'])")
check "dos alumnos vinculados" 2 "$NLEARNERS"

STAFF="$TMP/staff.jar"; rm -f "$STAFF"
check "login staff" 201 "$(req "$STAFF" POST /auth/dev-login '{"profile":"staff"}')"
check "cola de revisión humana" 200 "$(req "$STAFF" GET '/human-reviews?status=pending')"
NPEND=$(jsonget "$TMP/last.json" x "len(d)")
echo "INFO  casos pendientes: $NPEND"
if [ "$NPEND" -ge 1 ] 2>/dev/null; then
  RID=$(jsonget "$TMP/last.json" x "d[0]['id']")
  check "decidir placement (confirmar)" 201 "$(req "$STAFF" POST "/human-reviews/$RID/decision" '{"decision":"confirmed","reason":"Evidencia consistente con B1; se confirma."}')"
  req "$DIEGO" GET "/enrollments/$ENR" >/dev/null
  check "placement ya no provisional" "False" "$(field "d['placement']['provisional']")"
fi
check "reporte de seguridad (alumno)" 201 "$(req "$DIEGO" POST /safety/report '{"category":"technical","comment":"El audio se cortó"}')"
check "staff ve casos de safety" 200 "$(req "$STAFF" GET /admin/safety/cases)"

echo "=== 4b. Estudio de contenido: tema → borrador IA → revisión docente → publicar (§8.1) ==="
check "overview del estudio" 200 "$(req "$STAFF" GET /studio/overview)"
check "generar borrador desde tema" 201 "$(req "$STAFF" POST /studio/lesson-drafts '{"topic":"El club de astronomía"}')"
DRAFT=$(field "d['id']")
check "borrador en estado draft" draft "$(field "d['status']")"
check "borrador INVISIBLE para el alumno" 404 "$(req "$DIEGO" POST "/enrollments/$ENR/sessions" "{\"lessonContractId\":\"$DRAFT\"}")"
check "publicar tras revisión docente" 201 "$(req "$STAFF" POST "/studio/lessons/$DRAFT/decision" '{"action":"publish"}')"
check "estado published" published "$(field "d['status']")"
check "publicada: el alumno ya puede estudiarla" 201 "$(req "$DIEGO" POST "/enrollments/$ENR/sessions" "{\"lessonContractId\":\"$DRAFT\"}")"

echo "=== 5. Aislamiento: Lucía no puede ver la inscripción de Diego ==="
check "acceso cruzado denegado" 403 "$(req "$LUCIA" GET "/enrollments/$ENR")"

echo ""
echo "RESULTADO: $PASS PASS · $FAIL FAIL"
[ "$FAIL" = "0" ]
