import matplotlib.pyplot as plt

def read_file(file_path):
    data = {}
    with open(file_path, 'r') as file:
        for line in file:
            res = line.strip().split(';')
            query = res[0]
            execution_time = res[1]
            data[query] = float(execution_time)
    return data

def plot_data(data1, data2):
    queries1, times1 = zip(*sorted(data1.items(), key=lambda x: x[1]))
    queries2, times2 = zip(*sorted(data2.items(), key=lambda x: x[1]))

    plt.plot(times1, label=res1)
    plt.plot(times2, label=res2)
    avg1 = 0
    avg2 = 0
    for time in times1:
        avg1 += time
    avg1 = avg1 / len(times1)	
    
    for time in times2:
        avg2 += time
    avg2 = avg2 / len(times2)	
    
    plt.axhline(y=avg1, color='b', linestyle='--', label='Average' + res1)
    plt.axhline(y=avg2, color='orange', linestyle='--', label='Average' + res2)
    
    plt.xticks(range(len(queries1)), queries1, rotation='vertical')
    plt.xlabel('Queries (sorted)')
    plt.ylabel('Execution Time')
    plt.title('Comparison of Execution Time')
    
    # Remove x-axis labels
    plt.xticks([])
    plt.yscale('log')
    plt.legend()
    plt.savefig('plots/' + res1 + '_VS_' + res2 + '.jpg')

if __name__ == "__main__":
    res1 = "res_sage_endpoint_60s_np_query"
    res2 = "res_fuseki_endpoint_np_query"

    file1_path = "results/" + res1 + ".csv"
    file2_path = "results/" + res2 + ".csv"

    data1 = read_file(file1_path)
    data2 = read_file(file2_path)

    plot_data(data1, data2)
