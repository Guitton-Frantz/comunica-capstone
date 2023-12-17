import os
import re
from shutil import copyfile


def add_optional_clause(query):
    # Extract the first triple pattern from the query
    match = re.search(r'.* .* .*\.', query)
    if match:
        triple_pattern = match.group(0).strip()

        # Create a regular expression pattern for the triple pattern
        triple_pattern_regex = re.escape(triple_pattern)

        # Add the OPTIONAL clause to the triple pattern
        modified_query = re.sub(triple_pattern_regex, f'OPTIONAL {{ {triple_pattern} }}', query, count=1)

        return modified_query
    else:
        # No triple pattern found
        return query

def process_files(input_folder, output_folder):
    # Create the output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Loop through files in the input folder
    for filename in os.listdir(input_folder):
        if filename.endswith(".sparql"):
            input_path = os.path.join(input_folder, filename)
            output_path = os.path.join(output_folder, filename)

            # Read the SPARQL query from the input file
            with open(input_path, 'r') as input_file:
                query = input_file.read()

            # Add optional pattern to the query
            modified_query = add_optional_clause(query)

            # Debugging: Print original and modified queries
            print(f"Original Query ({filename}):")
            print(query)
            print("\nModified Query:")
            print(modified_query)
            print("="*30)

            # Write the modified query to the output file
            with open(output_path, 'w') as output_file:
                output_file.write(modified_query)

if __name__ == "__main__":
    # Replace 'input_folder' and 'output_folder' with your actual paths
    input_folder = 'queries/fast_queries'
    output_folder = 'queries/fast_queries_opt'

    process_files(input_folder, output_folder)
    print("Conversion completed.")
