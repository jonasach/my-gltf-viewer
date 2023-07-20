Copy code
#!/bin/bash

# Get the current date and time in the desired format
timestamp=$(date +"%m.%d.%Y %p")

# Add all changes to the staging area
git add .

# Commit the changes with the dynamically generated timestamp
git commit -m "$timestamp"

# Push the changes to the remote repository
git push origin main


