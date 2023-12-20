import sys
import matplotlib.pyplot as plt
import pandas as pd

# get data url from argument
data_url = sys.argv[1]
data_url2 = sys.argv[2]
data_url3 = sys.argv[3]

# load csv data
# first column is string, second column is float
data = pd.read_csv(data_url, header=None, names=['name', 'value'], dtype={'name': str, 'value': float}, delimiter=';')
data2 = pd.read_csv(data_url2, header=None, names=['name', 'value', 'iterations'], dtype={'name': str, 'value': float, 'iterations': float}, delimiter=';')
data3 = pd.read_csv(data_url3, header=None, names=['name', 'value'], dtype={'name': str, 'value': float}, delimiter=';')


# make average value where the same name
data = data.groupby('name').mean().reset_index()
data2 = data2.groupby('name').mean().reset_index()
data3 = data3.groupby('name').mean().reset_index()

# sort data by value
data = data.sort_values(by=['value'])
data2 = data2.sort_values(by=['value'])
data3 = data3.sort_values(by=['value'])

# plot data
plt.title('Query execution time')
plt.ylabel('Execution time (ms)')

plt.bar(data['name'], data['value'])
plt.bar(data2['name'], data2['value'])
plt.bar(data3['name'], data3['value'])

# plot average execution time
avg = data['value'].mean()
avg2 = data2['value'].mean()
avg3 = data3['value'].mean()

plt.axhline(y=avg, color='b', linestyle='--', label='Average 1')
plt.axhline(y=avg2, color='orange', linestyle='--', label='Average 2')
plt.axhline(y=avg3, color='g', linestyle='--', label='Average 3')

plt.legend(['fuseki tpf', 'sage 60 s', 'fuseki endpoint bgp', 'Average fuseki tpf', 'Average sage 60 s', 'Average fuseki endpoint bgp'])
plt.yscale('log')

plt.xticks([])
plt.show()

# plt.savefig(data_url + '.png')
