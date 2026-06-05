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

# Default settings
EVAL_MODE="false"
LLM_ENABLED="false"
TARGET_GAMES=""
MAX_ROUNDS=""
LLM_MODEL=""
MAX_LLM_API_ERRORS=""
MAX_LLM_INVALID_PLAYS=""

MODELS=()
DEFAULT_MODELS=(
    "deepseek/deepseek-chat"
    "meta-llama/llama-3.3-70b-instruct"
    "google/gemini-2.5-flash"
)

# Parse CLI arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -e|--eval)
            EVAL_MODE="true"
            LLM_ENABLED="true"
            shift
            ;;
        -l|--llm)
            LLM_ENABLED="true"
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
            echo "Shengji AI Simulation & Evaluation Runner"
            echo "Usage: ./.agents/skills/model-evaluation/scripts/run.sh [options] [model1 model2 ...]"
            echo ""
            echo "Options:"
            echo "  -l, --llm                Run a single simulation with live LLM enabled (default: local rule-based AI)"
            echo "  -e, --eval               Run multi-model evaluation benchmarking mode"
            echo "  -g, --games <number>     Set number of games to simulate (defaults: 3 for single local, 1 for LLM/Eval)"
            echo "  -r, --rounds <number>    Set maximum rounds per game (defaults: 60 for local, 1 for LLM/Eval)"
            echo "  -m, --model <id>         Set specific LLM model ID for single LLM simulation"
            echo "  --max-api-errors <n>     Set maximum allowed API exceptions before aborting (defaults: 3 for single, 20 for Eval)"
            echo "  --max-invalid-plays <n>  Set maximum allowed invalid plays before aborting (defaults: 10 for single, 20 for Eval)"
            echo "  -h, --help               Show this help message"
            echo ""
            echo "Models passed as positional arguments will trigger evaluation mode automatically."
            exit 0
            ;;
        *)
            MODELS+=("$1")
            EVAL_MODE="true"
            LLM_ENABLED="true"
            shift
            ;;
    esac
done

# Apply defaults based on run mode
if [ "$EVAL_MODE" = "true" ]; then
    [ -z "$TARGET_GAMES" ] && TARGET_GAMES="1"
    [ -z "$MAX_ROUNDS" ] && MAX_ROUNDS="1"
    [ -z "$MAX_LLM_API_ERRORS" ] && MAX_LLM_API_ERRORS="20"
    [ -z "$MAX_LLM_INVALID_PLAYS" ] && MAX_LLM_INVALID_PLAYS="20"
    
    if [ ${#MODELS[@]} -eq 0 ]; then
        MODELS=("${DEFAULT_MODELS[@]}")
    fi
else
    # Single simulation mode
    if [ "$LLM_ENABLED" = "true" ]; then
        [ -z "$TARGET_GAMES" ] && TARGET_GAMES="1"
        [ -z "$MAX_ROUNDS" ] && MAX_ROUNDS="1"
        [ -z "$MAX_LLM_API_ERRORS" ] && MAX_LLM_API_ERRORS="3"
        [ -z "$MAX_LLM_INVALID_PLAYS" ] && MAX_LLM_INVALID_PLAYS="10"
    else
        [ -z "$TARGET_GAMES" ] && TARGET_GAMES="3"
        [ -z "$MAX_ROUNDS" ] && MAX_ROUNDS="60"
    fi
fi

# Export variables
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

# Helper function to extract values from summary log
get_val() {
    local pattern="$1"
    local file="$2"
    if [ ! -f "$file" ]; then
        echo "N/A"
        return
    fi
    local res
    res=$(grep -i "$pattern" "$file" | head -n 1 | sed -E 's/.*:[[:space:]]*//' | sed -E 's/^[[:space:]]*//')
    if [ -z "$res" ]; then
        echo "N/A"
    else
        echo "$res"
    fi
}

if [ "$EVAL_MODE" = "true" ]; then
    # Multi-model evaluation mode
    echo "================================================================="
    echo "        SHENGJI SIMULATION MULTI-MODEL STRATEGIC EVALUATION"
    echo "================================================================="
    echo "• Target Games:      $TARGET_GAMES"
    echo "• Max Rounds:        $MAX_ROUNDS"
    echo "• Max API Errors:    $MAX_LLM_API_ERRORS"
    echo "• Max Invalid Plays:  $MAX_LLM_INVALID_PLAYS"
    echo "• Models to test:    ${MODELS[*]}"
    echo "================================================================="
    echo ""

    RESULTS_FILE=$(mktemp)

    for model in "${MODELS[@]}"; do
        echo "-----------------------------------------------------------------"
        echo "🤖 STARTING EVALUATION FOR: $model"
        echo "-----------------------------------------------------------------"
        
        export LLM_MODEL="$model"
        npm run test:simulation
        RUN_STATUS=$?
        
        LATEST_SUMMARY=$(ls -t logs/*-summary.txt 2>/dev/null | head -n 1)
        
        if [ $RUN_STATUS -ne 0 ] || [ -z "$LATEST_SUMMARY" ]; then
            echo "❌ Evaluation crashed or failed to complete for $model"
            echo "$model|ERROR|-|-|-|-|-" >> "$RESULTS_FILE"
        else
            echo "✅ Finished evaluation for $model"
            
            reqs=$(get_val "Total LLM Plays Requested" "$LATEST_SUMMARY")
            success=$(get_val "Successful LLM Plays" "$LATEST_SUMMARY")
            api_errs=$(get_val "LLM Plays API / Timeout Fallbacks" "$LATEST_SUMMARY")
            violations=$(get_val "LLM Invalid Card Rule Violations Retried" "$LATEST_SUMMARY")
            success_rate=$(get_val "Overall Telemetry Success Rate" "$LATEST_SUMMARY")
            duration=$(get_val "Total Duration" "$LATEST_SUMMARY")
            
            [ "$reqs" = "N/A" ] && reqs="0"
            [ "$success" = "N/A" ] && success="0"
            [ "$api_errs" = "N/A" ] && api_errs="0"
            [ "$violations" = "N/A" ] && violations="0"
            [ "$success_rate" = "N/A" ] && success_rate="0.0%"
            
            echo "$model|OK|$reqs|$success|$api_errs|$violations|$success_rate|$duration" >> "$RESULTS_FILE"
        fi
        echo ""
    done

    echo "=========================================================================================="
    echo "                               MODEL STRATEGIC EVALUATION REPORT"
    echo "=========================================================================================="
    printf "%-35s | %-7s | %-12s | %-7s | %-9s | %-9s | %-9s\n" "MODEL ID" "STATUS" "REQS (SUCCESS)" "API ERR" "RULE VIOL" "SUCCESS %" "DURATION"
    echo "------------------------------------------------------------------------------------------"

    while IFS="|" read -r model status reqs success api_errs violations success_rate duration; do
        if [ "$status" = "ERROR" ]; then
            printf "%-35s | \e[31m%-7s\e[0s | %-12s | %-7s | %-9s | %-9s | %-9s\n" "$model" "CRASH" "-" "-" "-" "-" "-"
        else
            success_num=$(echo "$success" | cut -d' ' -f1)
            printf "%-35s | \e[32m%-7s\e[0s | %-12s | %-7s | %-9s | %-9s | %-9s\n" "$model" "SUCCESS" "$reqs ($success_num)" "$api_errs" "$violations" "$success_rate" "$duration"
        fi
    done < "$RESULTS_FILE"

    echo "=========================================================================================="
    echo "Telemetries and detailed turn reasonings have been saved under their respective log files"
    echo "in the logs/ directory. Check the latest summary file for a complete event breakdown."
    echo "=========================================================================================="

    rm -f "$RESULTS_FILE"

else
    # Single simulation mode
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

    npm run test:simulation
fi
