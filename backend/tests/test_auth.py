import json


def test_register(test_client):
    """
    GIVEN a Flask application
    WHEN the '/api/register' page is posted to (with valid data)
    THEN check that a '201' status code is returned and the user is in the database
    """
    response = test_client.post(
        "/api/register",
        data=json.dumps(
            dict(username="newuser", email="newuser@example.com", password="password")
        ),
        content_type="application/json",
    )
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["user"]["username"] == "newuser"


def test_login(test_client, new_user):
    """
    GIVEN a Flask application and a registered user
    WHEN the '/api/login' page is posted to (with valid credentials)
    THEN check that a '200' status code is returned and the user is logged in
    """
    response = test_client.post(
        "/api/login",
        data=json.dumps(dict(username=new_user.username, password="password")),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["user"]["username"] == new_user.username


def test_logout(test_client, new_user):
    """
    GIVEN a Flask application and a logged-in user
    WHEN the '/api/logout' page is posted to
    THEN check that a '200' status code is returned and the user is logged out
    """
    # First, log in the user
    test_client.post(
        "/api/login",
        data=json.dumps(dict(username=new_user.username, password="password")),
        content_type="application/json",
    )

    # Then, log out
    response = test_client.post("/api/logout")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["message"] == "Logged out successfully"


def test_get_user(test_client, new_user):
    """
    GIVEN a Flask application and a logged-in user
    WHEN the '/api/user' page is requested
    THEN check that a '200' status code is returned and the correct user is returned
    """
    # Log in the user
    with test_client.session_transaction() as session:
        session["user_id"] = new_user.id

    response = test_client.get("/api/user")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["user"]["username"] == new_user.username
