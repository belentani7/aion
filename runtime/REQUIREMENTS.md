# Requisitos del runtime local AION

## Lo que se ha validado aquí

El entorno de prueba tiene 6 CPU lógicas, 3.8 GiB de RAM, 32 GiB de disco libre y no tiene GPU. Se instaló Ollama 0.33.1 y el modelo local `qwen2.5-coder:0.5b` (398 MB, cuantización Q4_K_M). AIOND lo detectó por loopback y respondió a una llamada OpenAI-compatible. A continuación, `aion-agent.mjs` generó un archivo JavaScript bajo `/tmp/aion-workspaces`, lo ejecutó con `AION_NETWORK=OFF` y validó la salida.

## Instalación en la máquina que hará la inferencia

1. Instalar Ollama con `bash runtime/install-local.sh` o instalar llama.cpp desde sus binarios oficiales.
2. Iniciar Ollama con `ollama serve` y elegir un modelo local. Para la prueba de humo: `ollama pull qwen2.5-coder:0.5b`.
3. Iniciar AIOND con `node runtime/aiond.mjs`. Solo escucha en `127.0.0.1:8088`.
4. Verificar con `node runtime/aion.mjs status`, `node runtime/aion.mjs models` y `node runtime/aion.mjs chat "hola"`.

## Selección de capacidad

El modelo de 0.5B sirve para confirmar instalación y recorridos simples; no equivale a un agente de código de gama alta. La familia Qwen2.5-Coder ofrece tamaños de 0.5B, 1.5B, 3B, 7B, 14B y 32B. Para proyectos reales, elige el tamaño que pueda residir en la RAM o VRAM del host junto a su contexto de trabajo. Si hay GPU, Ollama puede usar NVIDIA, AMD o Metal según soporte oficial.

## Límite de esta plataforma

El runtime de producción no debe quedarse dentro del hosting web administrado: la inferencia local requiere un proceso continuo, pesos de modelos y recursos que se mantengan disponibles. La ruta sin coste de API es alojar AIOND en tu ordenador y conectar una carpeta local desde Manus Desktop; usa el panel web solo para control y registro si te interesa.

## Estado de adaptadores

Ollama ha sido instalado y probado de extremo a extremo en este entorno. El adaptador de llama.cpp está implementado contra su servidor OpenAI-compatible local, pero no se ha probado aquí porque no había binario ni modelo GGUF instalados. Para verificarlo, inicia `llama serve` en `127.0.0.1:8080`, define `AION_LLAMA_CPP_URL` si usas otro puerto y ejecuta `node runtime/aion.mjs status`.

## Seguridad mínima

AIOND rechaza endpoints de modelos que no sean loopback, no incorpora llaves de proveedores y no expone su puerto fuera de localhost. El agente de prueba escribe únicamente bajo `/tmp/aion-workspaces`, bloquea paths relativos con `..` y ejecuta validación Node sin red. Antes de abrir AIOND en una red local, añade autenticación, TLS y una política de procesos más estricta.

## Fuentes

- [Ollama: instalación en Linux](https://docs.ollama.com/linux)
- [Ollama: soporte de hardware](https://docs.ollama.com/gpu)
- [Qwen2.5-Coder 0.5B: tamaño y uso](https://ollama.com/library/qwen2.5-coder:0.5b)
- [llama.cpp: servidor API compatible](https://github.com/ggml-org/llama.cpp)
