import pandas as pd
import matplotlib.pyplot as plt

# Read data from CSV file without a header
file_name = 'res_sage_endpoint_623ms_np_query'
file_path = 'results/' + file_name + '.csv'
df = pd.read_csv(file_path, header=None, names=['Query', 'Execution Time (ms)', 'Iterations'], delimiter=';')

# Display the average execution time
df = df.groupby('Query').mean().reset_index()
df = df.sort_values(by=['Execution Time (ms)'])

# Plotting
plt.figure(figsize=(12, 6))
plt.bar(range(len(df)), df['Execution Time (ms)'], color='blue', label='Query Execution Time')
plt.axhline(y=df['Execution Time (ms)'].mean(), color='red', linestyle='--', label='Average Execution Time')



# Add y-axis label and title
plt.ylabel('Execution Time (ms)')
plt.title('Query Execution Time for : ' + file_name)


average_exec_time = df['Execution Time (ms)'].mean()
plt.text(len(df) + 0.1, average_exec_time, f'Average: {average_exec_time:.2f} ms', color='red')

# Remove x-axis labels
plt.xticks([])

# Show the plot
plt.legend()
plt.yscale('log')
#plt.show()
plt.savefig('plots/' + file_name + '.jpg')
