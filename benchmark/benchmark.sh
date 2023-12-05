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

# for each file in queryDirectory run the benchmark
for i in $(seq 1 $3)
do
    for filename in $1/*.sparql; 
    do
        echo "Running query: $filename"
        start_time=$(date +%s%N)
        node engines/query-sparql/bin/query.js http://localhost:3330/watdiv10M/sparql -f $filename >> ./benchmark/resrequest.txt
        end_time=$(date +%s%N)
        echo $end_time
        # Calculate the time it took to run the query
        time_diff=$((end_time - start_time))
        time_diff=$((time_diff/1000000))
        echo "Time to run query: $time_diff ms"
        echo "$filename;$time_diff" >> $2
    done
done 
