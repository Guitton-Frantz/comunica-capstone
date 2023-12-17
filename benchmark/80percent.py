from collections import defaultdict

# Read data from file
with open('./benchmark/res_fuseki_endpoint_bgp.csv', 'r') as file:
    data = file.readlines()

# Create a dictionary to store query times for each query name
query_times_dict = defaultdict(list)

# Extract query times and organize them by query name
for line in data:
    query_name, query_time = line.split(';')
    query_times_dict[query_name].append(int(query_time))

# Calculate average time for each query name
average_times_dict = {query_name: sum(times) / len(times) for query_name, times in query_times_dict.items()}

# Calculate the value such that 80% of time averages are below that value
all_averages = [avg for avg in average_times_dict.values()]
threshold_index = int(0.8 * len(all_averages))
threshold_value = sorted(all_averages)[threshold_index]

# Calculate overall average time
overall_average_time = sum(all_averages) / len(all_averages)

print(f"Average time for each query: {overall_average_time:.2f}")
print(f"Threshold value for 80% below: {threshold_value:.2f}")
