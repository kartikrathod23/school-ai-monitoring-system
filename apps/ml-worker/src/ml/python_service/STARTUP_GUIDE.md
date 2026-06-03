### create virtual environment
```
cd <path_to_python_service_directory>
python3.11 -m venv venv
```

### Activate
```
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows
```

### install dependencies
```
pip install -r requirements.txt 
```

### Run the server
```
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```