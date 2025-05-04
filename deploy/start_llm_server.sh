#!/bin/bash
# Script to start the LLM server in GPU mode (optimized for Tesla P40)

echo "Starting LLM server in GPU-accelerated mode..."

# Directory for llama.cpp
mkdir -p llama.cpp
cd llama.cpp

# Check if llama.cpp is already cloned
if [ ! -d ".git" ]; then
    echo "Cloning llama.cpp repository..."
    git clone https://github.com/ggerganov/llama.cpp .
    
    # Build llama.cpp with GPU support
    echo "Building llama.cpp with CUDA support..."
    mkdir -p build
    cd build
    cmake -DLLAMA_CUBLAS=ON -DLLAMA_CUDA_F16=ON ..
    cmake --build . --config Release -j$(nproc)
    cd ..
else
    echo "llama.cpp already cloned, updating repository..."
    git pull
    
    # Rebuild with GPU support
    echo "Rebuilding llama.cpp with CUDA support..."
    cd build
    cmake -DLLAMA_CUBLAS=ON -DLLAMA_CUDA_F16=ON ..
    cmake --build . --config Release -j$(nproc)
    cd ..
fi

# Get hardware details
GPU_MEM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | awk '{print $1}')
CPU_CORES=$(nproc)

# Calculate optimal settings for Tesla P40
# P40 has 24GB memory, but we'll be conservative
if [ -z "$GPU_MEM" ]; then
    GPU_MEM=24000  # Default if nvidia-smi fails
fi

# Calculate context size (70% of GPU memory in MB converted to tokens)
CONTEXT_SIZE=$((GPU_MEM * 7 / 10 * 128))
if [ $CONTEXT_SIZE -gt 16384 ]; then
    CONTEXT_SIZE=16384  # Cap at 16K tokens for stability
fi

# Set threads to number of CPU cores, leave some for system
SERVER_THREADS=$((CPU_CORES * 3 / 4))
if [ $SERVER_THREADS -lt 1 ]; then
    SERVER_THREADS=1
fi

# Set batch size according to GPU
BATCH_SIZE=512

# Check if we're using the Meta or Mistral model
echo "Using Mistral 7B model..."
    
    # For Meta's original model, we need to install and use a different server
    # Check if transformers and torch are installed
    python3 -c "import transformers, torch" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "Installing required Python packages for Meta model..."
        pip install --upgrade pip
        pip install torch transformers accelerate bitsandbytes sentencepiece protobuf
    fi
    
    # Create server script for the Meta model
    cat > start_meta_server.py << EOF
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from flask import Flask, request, jsonify
import numpy as np
import json
import os
import threading

# Configure model path and device
MODEL_PATH = "../../../models/meta/llama-3.1-8b"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
PORT = 8080

app = Flask(__name__)

# Load model and tokenizer with 4-bit quantization for memory efficiency
print(f"Loading model from {MODEL_PATH} on {DEVICE}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    device_map="auto",
    torch_dtype=torch.float16,
    load_in_4bit=True,
)

generator = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer
)

# Create a simple embedding function
def get_embeddings(text):
    # This is a simplified embedding - ideally use a proper embedding model
    # But this will work for basic compatibility
    tokens = tokenizer.encode(text, return_tensors="pt")
    with torch.no_grad():
        outputs = model(tokens, output_hidden_states=True)
        # Use last hidden state average as the embedding
        embedding = outputs.hidden_states[-1].mean(dim=1).squeeze().cpu().numpy()
        # Normalize to unit length
        embedding = embedding / np.linalg.norm(embedding)
    return embedding.tolist()

@app.route('/v1/completions', methods=['POST'])
def completions():
    data = request.json
    prompt = data.get('prompt', '')
    max_tokens = data.get('max_tokens', 256)
    temperature = data.get('temperature', 0.7)
    
    try:
        result = generator(
            prompt, 
            max_new_tokens=max_tokens, 
            temperature=temperature,
            do_sample=temperature > 0,
        )
        
        return jsonify({
            'id': 'cmpl-meta-llama-3.1',
            'object': 'text_completion',
            'created': 0,
            'model': 'meta-llama/Llama-3.1-8B-Instruct',
            'choices': [{
                'text': result[0]['generated_text'][len(prompt):],
                'index': 0,
                'logprobs': None,
                'finish_reason': 'length'
            }]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/v1/embeddings', methods=['POST'])
def embeddings():
    data = request.json
    input_text = data.get('input', '')
    
    if isinstance(input_text, list):
        embeddings = [get_embeddings(text) for text in input_text]
    else:
        embeddings = [get_embeddings(input_text)]
    
    return jsonify({
        'object': 'list',
        'data': [{'object': 'embedding', 'embedding': emb, 'index': i} for i, emb in enumerate(embeddings)],
        'model': 'meta-llama/Llama-3.1-8B-Instruct-embedding'
    })

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.json
    messages = data.get('messages', [])
    max_tokens = data.get('max_tokens', 256)
    temperature = data.get('temperature', 0.7)
    
    # Construct prompt from messages
    prompt = ""
    for msg in messages:
        role = msg.get('role', '')
        content = msg.get('content', '')
        if role == 'system':
            prompt += f"<s>[INST] <<SYS>>\n{content}\n<</SYS>>\n\n"
        elif role == 'user':
            if not prompt:  # First message
                prompt += f"<s>[INST] {content} [/INST]"
            else:  # Continuation
                prompt += f"{content} [/INST]"
        elif role == 'assistant':
            prompt += f"{content} </s><s>[INST] "
    
    try:
        result = generator(
            prompt, 
            max_new_tokens=max_tokens, 
            temperature=temperature,
            do_sample=temperature > 0,
        )
        
        # Extract the generated response
        generated_text = result[0]['generated_text']
        response = generated_text[len(prompt):].strip()
        if response.endswith("[/INST]"):
            response = response[:-7].strip()
        
        return jsonify({
            'id': 'chatcmpl-meta-llama-3.1',
            'object': 'chat.completion',
            'created': 0,
            'model': 'meta-llama/Llama-3.1-8B-Instruct',
            'choices': [{
                'index': 0,
                'message': {
                    'role': 'assistant',
                    'content': response
                },
                'finish_reason': 'stop'
            }]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print(f"Meta Llama 3.1 server starting on port {PORT}...")
    app.run(host='0.0.0.0', port=PORT, threaded=True)
EOF
    
    # Start the Meta model server
    echo "Starting Meta Llama 3.1 server with GPU acceleration..."
    python3 start_meta_server.py
    
else
    # Use the original llama.cpp server with GGUF model
    echo "Starting llama.cpp server with CUDA acceleration, $CONTEXT_SIZE context size, and batch size $BATCH_SIZE..."
    cd build
    ./server \
        -m ../../../models/gguf/llama-3.1-8b.Q5_K_M.gguf \
        --host 0.0.0.0 \
        --port 8080 \
        --ctx-size $CONTEXT_SIZE \
        --batch-size $BATCH_SIZE \
        --threads $SERVER_THREADS \
        --embedding \
        --parallel 4 \
        --cont-batching \
        --log-disable \
        --gpu-layers 100
fi