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

check "health live" 200 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" "$API/health/live")"
check "health ready" 200 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" "$API/health/ready")"
# Contrato web↔API: la ruta pública de la demo de voz debe existir en el MISMO commit
# que la web que la consume. Cuerpo inválido → 400 (la validación corre antes del rate
# limit, así el check es repetible); un 404 aquí = API desplegada sin la ruta.
check "voice-demo ruta registrada (nunca 404)" 400 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"sdp":"x"}' "$API/voice-demo/call")"

echo "=== 0. Onboarding completo: apoderado → cuenta gestionada → clave privada → asentimiento ==="
TS=$(date +%s)
TEMP_PW="Temp-Sm0ke-$TS"
SMOKE_PW="Priv-Sm0ke-$TS"
# Nico nace siempre con 13 garantizados (banda 12-13) para que los gates duren años.
NICO_BY=$(($(date +%Y) - 14))
NICO_LOGIN="nico-$TS"
PADRE="$TMP/padre.jar"; rm -f "$PADRE"
check "apoderada CI entra solo por dev-login" 201 "$(req "$PADRE" POST /auth/dev-login '{"profile":"guardian"}')"
check "registro público de un menor redirigido al apoderado" 403 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"displayName\":\"Nico Prueba\",\"email\":\"nico-$TS@demo.pe\",\"password\":\"$TEMP_PW\",\"birthYear\":$NICO_BY}" "$API/auth/register-learner")"
check "apoderada crea la cuenta gestionada de Nico" 201 "$(req "$PADRE" POST /guardian/learners "{\"displayName\":\"Nico Prueba\",\"loginName\":\"$NICO_LOGIN\",\"password\":\"$TEMP_PW\",\"birthYear\":$NICO_BY,\"legalGuardianAttestation\":true,\"consentNoticeVersion\":\"2026-07\",\"consents\":{\"service\":true,\"storage\":true,\"ai_voice\":true,\"international_transfer\":true}}")"
NICOID=$(field "d['learner']['id']")
check "menor de 12 rechazado en cuenta gestionada" 403 "$(req "$PADRE" POST /guardian/learners "{\"displayName\":\"Peque\",\"loginName\":\"peque-$TS\",\"password\":\"$TEMP_PW\",\"birthYear\":$(($(date +%Y) - 11)),\"legalGuardianAttestation\":true,\"consentNoticeVersion\":\"2026-07\",\"consents\":{\"service\":true,\"storage\":true,\"ai_voice\":false,\"international_transfer\":false}}")"
check "usuario de acceso duplicado rechazado" 409 "$(req "$PADRE" POST /guardian/learners "{\"displayName\":\"Nico Clon\",\"loginName\":\"$NICO_LOGIN\",\"password\":\"$TEMP_PW\",\"birthYear\":$NICO_BY,\"legalGuardianAttestation\":true,\"consentNoticeVersion\":\"2026-07\",\"consents\":{\"service\":true,\"storage\":true,\"ai_voice\":false,\"international_transfer\":false}}")"
NICO="$TMP/nico.jar"; rm -f "$NICO"
check "Nico entra con la clave temporal" 201 "$(req "$NICO" POST /auth/login "{\"identifier\":\"$NICO_LOGIN\",\"password\":\"$TEMP_PW\"}")"
check "primer ingreso exige cambiar la clave" change_password "$(field "d['nextAction']")"
check "barrera impide usar el producto con clave temporal" 403 "$(req "$NICO" POST /enrollments '{"programCode":"english-path"}')"
check "Nico crea su clave privada" 201 "$(req "$NICO" POST /auth/change-initial-password "{\"password\":\"$SMOKE_PW\"}")"
check "después de la clave corresponde asentimiento" youth_assent "$(field "d['nextAction']")"
NICO2="$TMP/nico2.jar"; rm -f "$NICO2"
check "login con la clave privada" 201 "$(req "$NICO2" POST /auth/login "{\"identifier\":\"$NICO_LOGIN\",\"password\":\"$SMOKE_PW\"}")"
check "la clave temporal quedó invalidada" 401 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"identifier\":\"$NICO_LOGIN\",\"password\":\"$TEMP_PW\"}" "$API/auth/login")"
check "recuperación no revela existencia" 201 "$(curl -s -o "$TMP/last.json" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"email":"no-existe@demo.pe"}' "$API/auth/forgot-password")"
check "una cuenta gestionada no puede invitar otro apoderado" 403 "$(req "$NICO" POST /family-invitations '{"guardianEmail":"otra@demo.pe"}')"
PENDING="$TMP/pending.jar"; rm -f "$PENDING"
check "registro apoderado queda pendiente" 201 "$(req "$PENDING" POST /auth/register-guardian "{\"displayName\":\"Madre Prueba\",\"email\":\"madre-$TS@demo.pe\",\"password\":\"$SMOKE_PW\",\"adultGuardianAttestation\":true}")"
check "respuesta exige verificar correo" pendingVerification "$(field "d['status']")"
check "registro pendiente NO abre sesión STAR" 401 "$(req "$PENDING" GET /auth/me)"
check "inscripción bloqueada sin asentimiento (CNS-02)" 403 "$(req "$NICO" POST /enrollments '{"programCode":"english-path"}')"
check "asentimiento del alumno" 201 "$(req "$NICO" POST /assents '{}')"
check "onboarding listo para inscribir" "True" "$(req "$NICO" GET /onboarding/status >/dev/null; field "d['readyToEnroll']")"
check "Nico (2012) clasifica 12-13 por edad garantizada" y12_13 "$(req "$NICO" GET /auth/me >/dev/null; field "d['ageBand']")"
check "sprint bloqueado en el ALTA para 12-13 (D04)" 403 "$(req "$NICO" POST /enrollments '{"programCode":"english-path","paceCode":"sprint"}')"
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

echo "=== 0c. Economía anti-farming + escritura solo-alumno (usuario fresco) ==="
check "sprint bloqueado al CAMBIAR ritmo para 12-13 (D04)" 403 "$(req "$NICO" PATCH "/enrollments/$NICOENR/pace" '{"paceCode":"sprint"}')"
check "confirmar ritmo Accelerated" 200 "$(req "$NICO" PATCH "/enrollments/$NICOENR/pace" '{"paceCode":"accelerated"}')"
check "plan del día del nuevo alumno" 200 "$(req "$NICO" GET "/enrollments/$NICOENR/today")"
NLESSON=$(jsonget "$TMP/last.json" x "[b for b in d['blocks'] if b['kind']=='lesson'][0]['lessonContractId']")
check "crear sesión de lección" 201 "$(req "$NICO" POST "/enrollments/$NICOENR/sessions" "{\"lessonContractId\":\"$NLESSON\"}")"
NSES=$(field "d['id']")
NACT=$(jsonget "$TMP/last.json" x "d['activities'][0]['id']")
req "$NICO" GET /economy/state >/dev/null; NBAL0=$(field "d['balance']")
check "responder mcq correcta (con premio)" 201 "$(req "$NICO" POST "/sessions/$NSES/activities/$NACT/submissions" '{"response":{"kind":"mcq","selectedIndex":1},"usedAids":false}')"
req "$NICO" GET /economy/state >/dev/null; NBAL1=$(field "d['balance']")
check "primer acierto otorga 10 Novas" 10 "$((NBAL1 - NBAL0))"
check "misma respuesta otra vez (duplicada)" 201 "$(req "$NICO" POST "/sessions/$NSES/activities/$NACT/submissions" '{"response":{"kind":"mcq","selectedIndex":1},"usedAids":false}')"
req "$NICO" GET /economy/state >/dev/null; NBAL2=$(field "d['balance']")
check "duplicado suma +0 Novas" 0 "$((NBAL2 - NBAL1))"
check "completar sesión con trabajo real" 201 "$(req "$NICO" POST "/sessions/$NSES/complete")"
req "$NICO" GET /economy/state >/dev/null; NBAL3=$(field "d['balance']")
check "lección con evidencia otorga 25 Novas" 25 "$((NBAL3 - NBAL2))"
check "segunda sesión de la misma lección" 201 "$(req "$NICO" POST "/enrollments/$NICOENR/sessions" "{\"lessonContractId\":\"$NLESSON\"}")"
NSES2=$(field "d['id']")
check "responder mal (evidencia sin acierto)" 201 "$(req "$NICO" POST "/sessions/$NSES2/activities/$NACT/submissions" '{"response":{"kind":"mcq","selectedIndex":0},"usedAids":false}')"
check "completar la sesión repetida" 201 "$(req "$NICO" POST "/sessions/$NSES2/complete")"
req "$NICO" GET /economy/state >/dev/null; NBAL4=$(field "d['balance']")
check "repetir la lección no vuelve a otorgar Novas" 0 "$((NBAL4 - NBAL3))"
check "apoderada NO inicia sesión del alumno" 403 "$(req "$PADRE" POST "/enrollments/$NICOENR/sessions" "{\"lessonContractId\":\"$NLESSON\"}")"
check "apoderada NO inicia voz del alumno" 403 "$(req "$PADRE" POST "/enrollments/$NICOENR/voice-sessions" "{\"lessonContractId\":\"$NLESSON\"}")"

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
  check "módulo adaptativo de Diego" module "$(req "$DIEGO" GET "/diagnostic-attempts/$ATT/next-items" >/dev/null; field "d['stage']")"
  for c in $(jsonget "$TMP/last.json" x "' '.join(i['code'] for i in d['items'])"); do
    req "$DIEGO" POST "/diagnostic-attempts/$ATT/responses" "{\"itemCode\":\"$c\",\"selectedIndex\":1}" >/dev/null
  done
  check "muestra writing de Diego" writing "$(req "$DIEGO" GET "/diagnostic-attempts/$ATT/next-items" >/dev/null; field "d['stage']")"
  DWCODE=$(jsonget "$TMP/last.json" x "d['items'][0]['code']")
  req "$DIEGO" POST "/diagnostic-attempts/$ATT/writing" "{\"itemCode\":\"$DWCODE\",\"text\":\"My name is Diego, and I study English every day because I want to enter university and understand engineering books. I also want to work with classmates from other countries, explain my ideas clearly, and ask useful questions. English will help me take part in international projects with confidence.\"}" >/dev/null
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
  req "$LUCIA" GET "/diagnostic-attempts/$LATT/next-items" >/dev/null
  for c in $(jsonget "$TMP/last.json" x "' '.join(i['code'] for i in d['items'])"); do
    req "$LUCIA" POST "/diagnostic-attempts/$LATT/responses" "{\"itemCode\":\"$c\",\"selectedIndex\":1}" >/dev/null
  done
  req "$LUCIA" GET "/diagnostic-attempts/$LATT/next-items" >/dev/null
  LWCODE=$(jsonget "$TMP/last.json" x "d['items'][0]['code']")
  req "$LUCIA" POST "/diagnostic-attempts/$LATT/writing" "{\"itemCode\":\"$LWCODE\",\"text\":\"My name is Lucia, and I want to improve my English to understand stories and study science at school. I would also like to speak with new friends and ask questions without feeling nervous. In the future, English will help me travel with my family and learn about other cultures.\"}" >/dev/null
  req "$LUCIA" POST "/diagnostic-attempts/$LATT/complete" >/dev/null
fi
ZCODE=$(req "$LUCIA" POST "/enrollments/$LENR/voice-sessions" "{\"lessonContractId\":\"$VLESSON\"}")
ZREASON=$(field "d['error']['code']")
check "voz Lucía denegada (403)" 403 "$ZCODE"
check "motivo exacto: ZDR_REQUIRED (gate D17)" ZDR_REQUIRED "$ZREASON"

echo "=== 3b. Economía de voz con alumna fresca 14-17 (repetible) ==="
SARA="$TMP/sara.jar"; rm -f "$SARA"
SARA_BY=$(($(date +%Y) - 15))
SARA_LOGIN="sara-$TS"
SARA_TEMP_PW="Sara-Temp-$TS"
SARA_PRIVATE_PW="Sara-Priv-$TS"
check "apoderada crea la cuenta gestionada de Sara" 201 "$(req "$PADRE" POST /guardian/learners "{\"displayName\":\"Sara Prueba\",\"loginName\":\"$SARA_LOGIN\",\"password\":\"$SARA_TEMP_PW\",\"birthYear\":$SARA_BY,\"legalGuardianAttestation\":true,\"consentNoticeVersion\":\"2026-07\",\"consents\":{\"service\":true,\"storage\":true,\"ai_voice\":true,\"international_transfer\":true}}")"
SARAID=$(field "d['learner']['id']")
check "Sara entra con la clave temporal" 201 "$(req "$SARA" POST /auth/login "{\"identifier\":\"$SARA_LOGIN\",\"password\":\"$SARA_TEMP_PW\"}")"
check "Sara crea su clave privada" 201 "$(req "$SARA" POST /auth/change-initial-password "{\"password\":\"$SARA_PRIVATE_PW\"}")"
check "Sara clasifica 14-17 (edad garantizada)" t14_17 "$(req "$SARA" GET /auth/me >/dev/null; field "d['ageBand']")"
check "asentimiento de Sara" 201 "$(req "$SARA" POST /assents '{}')"
check "inscripción de Sara" 201 "$(req "$SARA" POST /enrollments '{"programCode":"english-path"}')"
SENR=$(field "d['id']")
req "$SARA" POST "/enrollments/$SENR/diagnostic-attempts" >/dev/null
SATT=$(field "d['id']")
for stage in 1 2; do
  req "$SARA" GET "/diagnostic-attempts/$SATT/next-items" >/dev/null
  for c in $(jsonget "$TMP/last.json" x "' '.join(i['code'] for i in d['items'])"); do
    req "$SARA" POST "/diagnostic-attempts/$SATT/responses" "{\"itemCode\":\"$c\",\"selectedIndex\":1}" >/dev/null
  done
done
req "$SARA" GET "/diagnostic-attempts/$SATT/next-items" >/dev/null
SWCODE=$(jsonget "$TMP/last.json" x "d['items'][0]['code']")
req "$SARA" POST "/diagnostic-attempts/$SATT/writing" "{\"itemCode\":\"$SWCODE\",\"text\":\"My name is Sara, and I study English every day after school because I want to apply for a university scholarship. I hope to speak confidently with my future classmates and professors in the United States. English will also help me understand lectures, write clear assignments, and participate in research projects.\"}" >/dev/null
check "diagnóstico de Sara completo" 201 "$(req "$SARA" POST "/diagnostic-attempts/$SATT/complete")"
check "ritmo de Sara confirmado" 200 "$(req "$SARA" PATCH "/enrollments/$SENR/pace" '{"paceCode":"accelerated"}')"
req "$SARA" GET "/enrollments/$SENR/today" >/dev/null
SVLESSON=$(jsonget "$TMP/last.json" x "[b for b in d['blocks'] if b['kind']=='voice_mission'][0]['lessonContractId']")
check "sesión de voz anti-falsificación" 201 "$(req "$SARA" POST "/enrollments/$SENR/voice-sessions" "{\"lessonContractId\":\"$SVLESSON\"}")"
SVFAKE=$(field "d['voiceSessionId']")
check "el cliente NO puede inventar 60 s al cerrar" 0 "$(req "$SARA" POST "/voice-sessions/$SVFAKE/end" '{"activeSeconds":60,"reason":"completed"}' >/dev/null; field "d['novasAwarded']")"
check "sesión de voz de Sara con tiempo real" 201 "$(req "$SARA" POST "/enrollments/$SENR/voice-sessions" "{\"lessonContractId\":\"$SVLESSON\"}")"
SVS=$(field "d['voiceSessionId']")
for _tick in 1 2 3 4 5 6; do
  sleep 10
  req "$SARA" POST "/voice-sessions/$SVS/heartbeat" '{"activeSecondsDelta":10}' >/dev/null
done
check "60 s verificados por heartbeat otorgan 30 Novas" 30 "$(req "$SARA" POST "/voice-sessions/$SVS/end" '{"activeSeconds":999,"reason":"completed"}' >/dev/null; field "d['novasAwarded']")"
check "sesión corta de Sara" 201 "$(req "$SARA" POST "/enrollments/$SENR/voice-sessions" "{\"lessonContractId\":\"$SVLESSON\"}")"
SVS2=$(field "d['voiceSessionId']")
check "5 s declarados sin tiempo real NO otorgan Novas" 0 "$(req "$SARA" POST "/voice-sessions/$SVS2/end" '{"activeSeconds":5,"reason":"user_exit"}' >/dev/null; field "d['novasAwarded']")"

echo "=== 4. Apoderada y staff ==="
ANA="$TMP/ana.jar"; rm -f "$ANA"
check "login Ana" 201 "$(req "$ANA" POST /auth/dev-login '{"profile":"guardian"}')"
check "resumen familiar" 200 "$(req "$ANA" GET /guardian/learners)"
NLEARNERS=$(jsonget "$TMP/last.json" x "len(d['learners'])")
check "al menos dos alumnos vinculados" True "$([ "$NLEARNERS" -ge 2 ] 2>/dev/null && echo True || echo False)"

STAFF="$TMP/staff.jar"; rm -f "$STAFF"
check "login staff" 201 "$(req "$STAFF" POST /auth/dev-login '{"profile":"staff"}')"
STAFF2="$TMP/staff2.jar"; rm -f "$STAFF2"
check "crear segundo staff revisor" 201 "$(req "$STAFF2" POST /auth/dev-login '{"displayName":"Prof. Mendoza","role":"staff"}')"
check "cola de revisión humana" 200 "$(req "$STAFF" GET '/human-reviews?status=pending')"
NPEND=$(jsonget "$TMP/last.json" x "len(d)")
echo "INFO  casos pendientes: $NPEND"
req "$DIEGO" GET "/enrollments/$ENR" >/dev/null
DIEGO_PROVISIONAL=$(field "d['placement']['provisional']")
if [ "$DIEGO_PROVISIONAL" = "True" ]; then
  req "$STAFF" GET '/human-reviews?status=pending' >/dev/null
  RID=$(jsonget "$TMP/last.json" x "[r for r in d if r['learner']=='Diego Torres' and r['caseType']=='placement'][0]['id']")
  check "decidir placement de Diego (confirmar)" 201 "$(req "$STAFF" POST "/human-reviews/$RID/decision" '{"decision":"confirmed","reason":"Evidencia consistente con B1; se confirma."}')"
else
  echo "INFO  placement de Diego ya había sido confirmado"
fi
req "$DIEGO" GET "/enrollments/$ENR" >/dev/null
check "placement de Diego ya no provisional" "False" "$(field "d['placement']['provisional']")"
check "reporte de seguridad (alumno)" 201 "$(req "$DIEGO" POST /safety/report '{"category":"technical","comment":"El audio se cortó"}')"
SCASE=$(field "d['caseId']")
check "staff ve casos de safety" 200 "$(req "$STAFF" GET /admin/safety/cases)"
check "staff tria caso de safety" 200 "$(req "$STAFF" PATCH "/admin/safety/cases/$SCASE" '{"status":"triaged"}')"
check "staff resuelve caso con motivo" 200 "$(req "$STAFF" PATCH "/admin/safety/cases/$SCASE" '{"status":"resolved","resolution":"Incidente técnico revisado; sin riesgo para el alumno."}')"

echo "=== 4b. Estudio de contenido: tema → borrador IA → revisión docente → publicar (§8.1) ==="
check "overview del estudio" 200 "$(req "$STAFF" GET /studio/overview)"
check "generar borrador desde tema" 201 "$(req "$STAFF" POST /studio/lesson-drafts '{"topic":"El club de astronomía"}')"
DRAFT=$(field "d['id']")
check "borrador en estado draft" draft "$(field "d['status']")"
check "borrador INVISIBLE para el alumno" 404 "$(req "$DIEGO" POST "/enrollments/$ENR/sessions" "{\"lessonContractId\":\"$DRAFT\"}")"
check "autor NO publica su propio borrador" 403 "$(req "$STAFF" POST "/studio/lessons/$DRAFT/decision" '{"action":"publish"}')"
check "segundo staff publica tras revisión" 201 "$(req "$STAFF2" POST "/studio/lessons/$DRAFT/decision" '{"action":"publish"}')"
check "estado published" published "$(field "d['status']")"
check "publicada: el alumno ya puede estudiarla" 201 "$(req "$DIEGO" POST "/enrollments/$ENR/sessions" "{\"lessonContractId\":\"$DRAFT\"}")"

echo "=== 5. Aislamiento: Lucía no puede ver la inscripción de Diego ==="
check "acceso cruzado denegado" 403 "$(req "$LUCIA" GET "/enrollments/$ENR")"

LOGOUT="$TMP/logout.jar"; rm -f "$LOGOUT"
check "crear sesión para revocación" 201 "$(req "$LOGOUT" POST /auth/dev-login '{"profile":"learner_teen"}')"
check "sesión activa antes de logout" 200 "$(req "$LOGOUT" GET /auth/me)"
check "logout revoca sesión server-side" 201 "$(req "$LOGOUT" POST /auth/logout)"
check "cookie revocada ya no autentica" 401 "$(req "$LOGOUT" GET /auth/me)"

echo ""
echo "RESULTADO: $PASS PASS · $FAIL FAIL"
[ "$FAIL" = "0" ]
