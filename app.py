from flask import Flask, jsonify, send_from_directory, render_template_string
from flask_cors import CORS
import strategy  # Ensure strategy.py is in the same directory or adjust the import path

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    with open('index.html') as f:
        return render_template_string(f.read())

@app.route('/main.js')
def main_js():
    return send_from_directory('.', 'main.js')

@app.route('/data', methods=['GET'])
def get_data():
    data, metadata = strategy.main()
    response = {
        'data': data,
        'metadata': metadata
    }
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)


