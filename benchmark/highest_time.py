def get_highest_time_value(file_path):
    highest_time_value = float('-inf')  # Initialize with negative infinity
    highest_time_line = None

    with open(file_path, 'r') as file:
        for line in file:
            name, time_value_str, _ = line.strip().split(';')
            time_value = float(time_value_str)

            if time_value > highest_time_value:
                highest_time_value = time_value
                highest_time_line = line.strip()

    return highest_time_line

# Example usage
file_path = "results/res_fuseki_endpoint_bgp.csv"  # Replace with the path to your file
highest_time_line = get_highest_time_value(file_path)

if highest_time_line:
    print(f"The line with the highest time value is: {highest_time_line}")
else:
    print("The file is empty or doesn't contain valid lines.")