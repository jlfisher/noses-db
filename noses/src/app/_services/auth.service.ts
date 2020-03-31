import { Injectable, NgZone } from "@angular/core";
import { User } from "../_supporting_classes/user";
import { auth } from "firebase/app";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore, AngularFirestoreDocument } from "@angular/fire/firestore";
import { Router } from "@angular/router";
import { Observable, of, BehaviorSubject } from  'rxjs';
import { FlaskBackendService } from './flask-backend.service';
import { sqlUser_full, sqlUser } from '../_supporting_classes/sqlUser';


@Injectable({
  providedIn: "root"
})
export class AuthService {


  public userData_fb: firebase.User; // Save logged in user data
  public userData: sqlUser_full;

  /**
   * Constructs the Auth.Service... Constructed at the root level so once it exists the same instance
   *  will be available to the entire program.
   * This will save user data in localstorage when logged in and setting up null when logged out
   * @param afs Inject Firestore service
   * @param afAuth Inject Firebase auth service
   * @param router reference to the router, which will allow us to change the page the user is currently on.
   * @param ngZone NgZone service to remove outside scope warning
   */
  constructor(public afs: AngularFirestore, public afAuth: AngularFireAuth, public router: Router, public ngZone: NgZone) {
    let userObservable_fb = this.afAuth.authState;

    // get the user object stored in firebase and put it in the local storage object
    userObservable_fb.subscribe( (user : firebase.User) => {
      this.updateLocalStorage_userData_fb(user);
    });
  }


  /**
   * doing this might be a security risk.
   */
  public getUserData() {
    return this.userData_fb;
  }

  public getUserData_full() {
    return this.userData;
  }


  /**
   * 
   */
  public getUserData_obs() {
    return of(this.userData_fb);
  }


  /**
   * If the value of user received by this function is non-null the user is logged in.
   * This will save user data in localstorage when logged in and setting up null when logged out.
   * @param user firebase user object received from firebase angular service.
   */
  private updateLocalStorage_userData_fb(user: firebase.User) {
    if (user) {
      this.userData_fb = user;
      localStorage.setItem("user", JSON.stringify(this.userData_fb));
      JSON.parse(localStorage.getItem("user"));
    } 
    else {
      localStorage.setItem("user", null);
      JSON.parse(localStorage.getItem("user"));
    }
  }


  /**
   * Sign in with email/password
   * 
   * Two callback functions:
   *    (1) signinwithemailandpassword
   *    (2) 
   * 
   * If the login is successful, the then callback is triggered.
   * If the login attempt fails, the catch operation is triggered.
   * @param email potential email address of a user
   * @param password potential password of a user
   */
  public SignIn(email, password) {
    let promise = this.afAuth.auth
      .signInWithEmailAndPassword(email, password)
      .then(result => this.setAppropriateVariablesSoUserIsLoggedIn(result))
      .catch(error => {
          console.log("*******Login Failed!");
          window.alert(error.message);
      });
    return promise;
  }
  

  /**
   * This method is called upon a successful login.
   * How does this method ensure that the user it "logged in"?
   * The SetUserData method should be setting some local variable with attributes of the FireBase user
   *  we just used to log in. 
   * 
   * @param result 
   */
  public setAppropriateVariablesSoUserIsLoggedIn(result : any) {


    console.log("*******Login Successful!")

    // redirect the user to the home page.
    this.ngZone.run(() => {
      this.router.navigate(["menu"]);
    });

    // set local variables with user information
    this.SetUserData(result.user);

    // testing output
    console.log("LOGIN COMPLETE");
    console.log("USER CREDENTIALS RETURNED BY SUCCESSFUL LOGIN:");
    console.log(result.user);
  }


  /**
   * signs out
   */
  public SignOut() {
    alert("successfully logged out");

    return this.afAuth.auth.signOut().then(() => {
      localStorage.removeItem("user");
      this.router.navigate(["sign-in"]);
    });
  }


  /**
   * Sign up with email/password
   * @param email 
   * @param password 
   */
  public SignUp(email, password) {
    var signupResult = this.afAuth.auth.createUserWithEmailAndPassword(email, password)
      .then(result => {
        /* Call the SendVerificaitonMail() function when new user sign up and returns promise */
        this.SendVerificationMail();
        // alert("New user successfully created and verification email was sent!");
        // this.SetUserData(result.user); // i dont want admin to log in under another account
      })
      .catch(error => {
        window.alert(error.message);
      });

    return signupResult;
  }


  /**
   * Send email verfificaiton when new user sign up
   * Notice that this implementation method doesn't rely on the api to know 
   * to send an email when a new user is created. 
   */
  public SendVerificationMail() {
    return this.afAuth.auth.currentUser.sendEmailVerification().then(() => {
      this.router.navigate(["verify-email"]);
    });
  }


  // Reset Forgot password
  public ForgotPassword(passwordResetEmail): Promise<void> {
    return this.afAuth.auth
      .sendPasswordResetEmail(passwordResetEmail)
      .then(() => {
        window.alert("Password reset email sent, check your inbox.");
      })
      .catch(error => {
        window.alert(error);
      });
  }


  /**
   * Returns true when user is logged in and email is verified
   */ 
  get isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user !== null) {
      return true;
    } 
    else {
      return false;
    }
  }


  /**
   * Setting up user data when sign in with username/password, sign up with username/password 
   *  and sign in with social auth provider in Firestore database using 
   *  AngularFirestore + AngularFirestoreDocument service
   * 
   * Creates an angular firestore document to thold the information of the currently logged in user.
   * It is initialized by providing a route to a users endpoint on the FireBase application
   * 
   * Notice that the userData variable has its structure defined in its declaration. 
   * 
   * 
   * @param user 
   */
  public SetUserData(user) : Promise<void> {

    // create an angular firestore document to hold the information of the currently logged in user
    const userRef: AngularFirestoreDocument<any> = this.afs.doc( `users/${user.uid}` );

    // structure to store relevant information of the user. 
    const userData: User = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
    const options = { merge: true }

    return userRef.set(userData, options);
  }

}