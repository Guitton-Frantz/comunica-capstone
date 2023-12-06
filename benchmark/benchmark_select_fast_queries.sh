# Benchmark to run the query engine with the given query and configuration

# Usage: ./benchmark.sh <queryDirectory> <output> <iterations>

# Example: ./benchmark.sh ../queries/queries.txt ../output/output.txt 10

# queryFile: Path to the file containing the queries to run
# config: Path to the configuration file to use TODO: Not implemented yet
# output: Path to the file to write the results to
# iterations: Number of times to run the benchmark

# The benchmark will run the query engine with the given query and configuration
# for the given number of iterations. The results will be written to the given
# output file.

# The output file will contain the following information:
# - The query that was run
# - The configuration that was used
# - The time it took to run the query for each iteration
# - The average time it took to run the query

# The output file will be overwritten if it already exists.

#!/bin/bash

# Create a directory for storing fast queries
mkdir -p ./queries/fast_queries

# Count the total number of queries
total_queries=$(find $1 -type f -name "*.sparql" | wc -l)

# Initialize a counter for completed queries
completed_queries=0

# for each file in queryDirectory run the benchmark
for i in $(seq 1 $3)
do
    for filename in $1/*.sparql; 
    do
        echo "Running query: $filename"
        start_time=$(date +%s%N)

        # Run the query with a timeout of 10 minutes
        timeout 10m node engines/query-sparql/bin/query.js http://localhost:3330/watdiv10M/sparql -f $filename > ./benchmark/temp_result.txt

        exit_status=$?

        end_time=$(date +%s%N)
        echo $end_time
        
        # Calculate the time it took to run the query
        time_diff=$((end_time - start_time))
        time_diff=$((time_diff/1000000))
        echo "Time to run query: $time_diff ms"

        if [ $exit_status -eq 0 ] && [ $time_diff -lt 600000 ]; then
            # If the query completed successfully within 10 minutes, copy the query file to the fast_queries directory
            cp $filename ./queries/fast_queries/
            echo "Query copied to fast_queries directory"
        else
            # If the query took longer than 10 minutes or had an error, print a message and move on to the next query
            echo "Query took longer than 1 minute or encountered an error. Skipping to the next query."
            continue
        fi

        echo "$filename;$time_diff" >> $2

        # Update the completed_queries counter and display progress
        completed_queries=$((completed_queries + 1))
        echo "Progress: $completed_queries/$total_queries queries completed"

    done
done