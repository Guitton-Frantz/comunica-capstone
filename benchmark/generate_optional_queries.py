import os
import re
from shutil import copyfile


def transform_query(input_query):
    lines = input_query.split('\n')[1:]
    transformed_query = "SELECT * WHERE {\n"
    subquery = "{\nSELECT * WHERE {\n"
    lines = lines[:-2]

    if(len(lines)==1):
        return "SELECT * WHERE {\n" + "OPTIONAL { " + lines[0] + " } \n}"
    

    optional = False; 

    for line in lines:
        if(not optional):
           transformed_query += '\tOPTIONAL { ' + line + ' }\n'
           optional = True
        else:
            subquery += line + '\n'
    
    subquery += '}\n}'
    transformed_query += subquery

    transformed_query += "}"

    return transformed_query

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
            modified_query = transform_query(query)

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
    input_folder = 'queries/watdiv_with_sage_plan'
    output_folder = 'queries/watdiv_with_sage_plan_optional_subquery'

    process_files(input_folder, output_folder)
    print("Conversion completed.")
