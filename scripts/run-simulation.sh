#!/bin/bash

# Load .env file if it exists, respecting already set environment variables (local overrides)
if [ -f .env ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        # Strip leading/trailing whitespaces
        line=$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
        # Skip empty lines and comments
        [[ -z "$line" || "$line" == \#* ]] && continue
        
        # Parse key and value
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            val="${BASH_REMATCH[2]}"
            
            # Trim key and value
            key=$(echo "$key" | sed -e 's/[[:space:]]*$//')
            val=$(echo "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
            
            # Strip enclosing quotes from value if present
            if [[ ($val == \"*\" && $val == *\") || ($val == \'*\' && $val == *\') ]]; then
                val="${val:1:-1}"
            fi
            
            # Only export if the variable is not already defined in the shell environment
            if ! declare -p "$key" &>/dev/null; then
                export "$key"="$val"
            fi
        fi
    done < .env
fi

# Apply script defaults only if not already defined via environment or .env
[ -z "$LLM_ENABLED" ] && LLM_ENABLED="false"
[ -z "$TARGET_GAMES" ] && TARGET_GAMES="3"
[ -z "$MAX_ROUNDS" ] && MAX_ROUNDS="60"
[ -z "$LLM_MODEL" ] && LLM_MODEL=""
[ -z "$MAX_LLM_API_ERRORS" ] && MAX_LLM_API_ERRORS="3"
[ -z "$MAX_LLM_INVALID_PLAYS" ] && MAX_LLM_INVALID_PLAYS="10"

# Parse CLI arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -l|--llm)
            LLM_ENABLED="true"
            TARGET_GAMES="1"
            MAX_ROUNDS="1"
            shift
            ;;
        -g|--games)
            TARGET_GAMES="$2"
            shift 2
            ;;
        -r|--rounds)
            MAX_ROUNDS="$2"
            shift 2
            ;;
        -m|--model)
            LLM_MODEL="$2"
            shift 2
            ;;
        --max-api-errors)
            MAX_LLM_API_ERRORS="$2"
            shift 2
            ;;
        --max-invalid-plays)
            MAX_LLM_INVALID_PLAYS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Shengji AI Simulation Runner"
            echo "Usage: ./scripts/run-simulation.sh [options]"
            echo ""
            echo "Options:"
            echo "  -l, --llm                Run with live LLM engine enabled (Defaults to 1 game, 1 round limit)"
            echo "  -g, --games <number>     Set number of target games to simulate"
            echo "  -r, --rounds <number>    Set maximum rounds per game"
            echo "  -m, --model <id>         Set specific LLM model ID (e.g. google/gemini-2.5-flash)"
            echo "  --max-api-errors <n>     Set maximum allowed API exceptions before aborting (default 3)"
            echo "  --max-invalid-plays <n>  Set maximum allowed invalid plays/retries before aborting (default 10)"
            echo "  -h, --help               Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage instructions."
            exit 1
            ;;
    esac
done

# Export environment variables
export LLM_ENABLED
export TARGET_GAMES
export MAX_ROUNDS
export MAX_LLM_API_ERRORS
export MAX_LLM_INVALID_PLAYS

if [ -n "$LLM_MODEL" ]; then
    export LLM_MODEL
elif [ -n "$OPENROUTER_MODEL" ]; then
    export LLM_MODEL="$OPENROUTER_MODEL"
fi

if [ -n "$OPENROUTER_API_KEY" ]; then
    export OPENROUTER_API_KEY
fi

# Print run configuration summary
echo "=============================================="
echo "      SHENGJI SIMULATION TEST RUNNER"
echo "=============================================="
echo "• LLM Enabled:       $LLM_ENABLED"
echo "• Target Games:      $TARGET_GAMES"
echo "• Max Rounds:        $MAX_ROUNDS"

if [ "$LLM_ENABLED" = "true" ]; then
    if [ -n "$LLM_MODEL" ]; then
        echo "• LLM Model:         $LLM_MODEL"
    elif [ -n "$OPENROUTER_MODEL" ]; then
        echo "• LLM Model:         $OPENROUTER_MODEL (from env/.env)"
    else
        echo "• LLM Model:         meta-llama/llama-3.3-70b-instruct (default)"
    fi
    
    if [ -n "$OPENROUTER_API_KEY" ]; then
        if [ ${#OPENROUTER_API_KEY} -gt 8 ]; then
            echo "• API Key:           ${OPENROUTER_API_KEY:0:4}...${OPENROUTER_API_KEY: -4}"
        else
            echo "• API Key:           [PRESENT / MASKED]"
        fi
    else
        echo "• API Key:           [MISSING - RUN WILL FAIL]"
    fi
    echo "• Max API Errors:    $MAX_LLM_API_ERRORS"
    echo "• Max Invalid Plays:  $MAX_LLM_INVALID_PLAYS"
fi
echo "=============================================="
echo "Starting simulation..."
echo ""

# Execute the test
npm run test:simulation
