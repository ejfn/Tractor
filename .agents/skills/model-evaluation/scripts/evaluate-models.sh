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

# Default settings for evaluations
TARGET_GAMES="1"
MAX_ROUNDS="1"
MAX_LLM_API_ERRORS="20"
MAX_LLM_INVALID_PLAYS="20"

# List of models to evaluate if not specified via arguments
DEFAULT_MODELS=(
    "deepseek/deepseek-chat"
    "meta-llama/llama-3.3-70b-instruct"
    "google/gemini-2.5-flash"
)

MODELS=()

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -g|--games)
            TARGET_GAMES="$2"
            shift 2
            ;;
        -r|--rounds)
            MAX_ROUNDS="$2"
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
            echo "Shengji AI Multi-Model Evaluation Runner"
            echo "Usage: ./.agents/skills/model-evaluation/scripts/evaluate-models.sh [options] [model1 model2 ...]"
            echo ""
            echo "Options:"
            echo "  -g, --games <number>     Set number of target games per model (default 1)"
            echo "  -r, --rounds <number>    Set maximum rounds per game (default 1)"
            echo "  --max-api-errors <n>     Set maximum allowed API exceptions before aborting (default 20)"
            echo "  --max-invalid-plays <n>  Set maximum allowed invalid plays/retries before aborting (default 20)"
            echo "  -h, --help               Show this help message"
            echo ""
            echo "If no models are specified, it defaults to evaluating:"
            echo "  - deepseek/deepseek-chat"
            echo "  - meta-llama/llama-3.3-70b-instruct"
            echo "  - google/gemini-2.5-flash"
            exit 0
            ;;
        *)
            MODELS+=("$1")
            shift
            ;;
    esac
done

if [ ${#MODELS[@]} -eq 0 ]; then
    MODELS=("${DEFAULT_MODELS[@]}")
fi

export LLM_ENABLED="true"
export TARGET_GAMES
export MAX_ROUNDS
export MAX_LLM_API_ERRORS
export MAX_LLM_INVALID_PLAYS

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

# Temporary file to store parsed metrics
RESULTS_FILE=$(mktemp)

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

# Run evaluations in a loop
for model in "${MODELS[@]}"; do
    echo "-----------------------------------------------------------------"
    echo "🤖 STARTING EVALUATION FOR: $model"
    echo "-----------------------------------------------------------------"
    
    export LLM_MODEL="$model"
    
    # Run simulation
    npm run test:simulation
    RUN_STATUS=$?
    
    # Locate the latest summary log file generated
    LATEST_SUMMARY=$(ls -t logs/*-summary.txt 2>/dev/null | head -n 1)
    
    if [ $RUN_STATUS -ne 0 ] || [ -z "$LATEST_SUMMARY" ]; then
        echo "❌ Evaluation crashed or failed to complete for $model"
        echo "$model|ERROR|-|-|-|-|-" >> "$RESULTS_FILE"
    else
        echo "✅ Finished evaluation for $model"
        
        # Parse statistics
        reqs=$(get_val "Total LLM Plays Requested" "$LATEST_SUMMARY")
        success=$(get_val "Successful LLM Plays" "$LATEST_SUMMARY")
        api_errs=$(get_val "LLM Plays API / Timeout Fallbacks" "$LATEST_SUMMARY")
        violations=$(get_val "LLM Invalid Card Rule Violations Retried" "$LATEST_SUMMARY")
        success_rate=$(get_val "Overall Telemetry Success Rate" "$LATEST_SUMMARY")
        duration=$(get_val "Total Duration" "$LATEST_SUMMARY")
        
        # Format parsed values
        [ "$reqs" = "N/A" ] && reqs="0"
        [ "$success" = "N/A" ] && success="0"
        [ "$api_errs" = "N/A" ] && api_errs="0"
        [ "$violations" = "N/A" ] && violations="0"
        [ "$success_rate" = "N/A" ] && success_rate="0.0%"
        
        echo "$model|OK|$reqs|$success|$api_errs|$violations|$success_rate|$duration" >> "$RESULTS_FILE"
    fi
    echo ""
done

# Print final comparison table
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
