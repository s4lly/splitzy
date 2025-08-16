from flask import Blueprint, render_template, request, redirect, url_for, flash, send_from_directory, current_app
import os
from werkzeug.utils import secure_filename

main_bp = Blueprint('main', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@main_bp.route('/')
def index():
    # Get list of uploaded files to display
    files = os.listdir(current_app.config['UPLOAD_FOLDER']) if os.path.exists(current_app.config['UPLOAD_FOLDER']) else []
    return render_template('index.html', files=files)

@main_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@main_bp.route('/upload', methods=['POST'])
def upload_file_route():
    # Check if the post request has the file part
    if 'file' not in request.files:
        flash('No file part')
        return redirect(request.url)

    file = request.files['file']

    # If user does not select file, browser also
    # submits an empty part without filename
    if file.filename == '':
        flash('No selected file')
        return redirect(url_for('main.index'))

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        flash('File successfully uploaded')

        # Redirect to analysis page
        return redirect(url_for('receipts.analyze', filename=filename))
    else:
        flash('Allowed file types are png, jpg, jpeg, gif')
        return redirect(url_for('main.index'))
