====================================================================
Recommender Systems
Domain: Book Recommendations (Goodreads)
Algorithm: Hybrid (TruncatedSVD Collaborative + TF-IDF Content-Based)
====================================================================

1. DATASET LINK
Because the dataset is massive (several gigabytes), the raw data files are not included in this zip file. Instead, the provided Python code will automatically download the required files directly from the official UCSD McAuley Lab repository.
Source Link: https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/

Files utilized by the script:
- goodreads_books.json.gz (Metadata)
- goodreads_interactions.csv (Interactions)
- book_id_map.csv & user_id_map.csv (Mappings)

2. LIBRARIES REQUIRED
The following standard data science libraries are required to run the code:
- pandas
- numpy
- scipy
- scikit-learn

3. HOW TO RUN THE CODE
1. Upload the provided `.ipynb` file to Google Colab.
2. Go to 'Runtime' -> 'Change runtime type' and select a T4 GPU / High-RAM environment (recommended due to the large number of interaction records).
3. Run Cell 1. You will be prompted to connect your Google Drive. The script will automatically create a folder (`/MyDrive/Recommender_Systems/Goodreads_Data`) and download the necessary dataset files directly into your permanent storage.
4. Run the remaining cells sequentially from top to bottom. The code is modular and executes Steps 1 through 5.

4. EXPECTED OUTPUTS
When running the notebook sequentially, expect the following outputs corresponding to the assignment steps:
- Step 2 (Data Prep): Will output a dataset sparsity calculation of exactly 99.96%.
- Step 4 (Evaluation): Will output an offline Leave-One-Out evaluation showing the Hybrid SVD model significantly outperforming the Most Popular baseline:
    * Baseline Hit Rate@10: ~2.00%
    * Hybrid SVD Hit Rate@10: ~19.00%
    * Hybrid SVD NDCG@10: ~0.1354
- Step 5 (Demonstration): Will output 3 live user scenarios:
    * Scenarios 1A & 1B: Demonstrates the "Time-Aware" bonus feature by proving recommendations shift when exponential decay heavily weights recent reads.
    * Scenarios 2A & 2B: Demonstrates the same Time-Aware feature on a different unique user.
    * Scenario 3: Demonstrates the "Cold-Start Handling" bonus feature by shifting a brand new user with no history to a 100% Content-Based recommendation engine using "onboarding seed" items.