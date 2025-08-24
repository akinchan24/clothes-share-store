// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqGSfaR7V-xCkf1jsOlMg4krIB2mVCXCc",
  authDomain: "clothes-share-106d7.firebaseapp.com",
  projectId: "clothes-share-106d7",
  storageBucket: "clothes-share-106d7.firebasestorage.app",
  messagingSenderId: "824215054024",
  appId: "1:824215054024:web:fe9d02caff17efa68a67fd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Firebase utility functions
export const FirebaseAPI = {
  // Users collection
  async createUser(userData) {
    try {
      await setDoc(doc(db, "users", userData.id), userData);
      return { success: true };
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, error };
    }
  },

  async getUser(userId) {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      } else {
        return { success: false, error: "User not found" };
      }
    } catch (error) {
      console.error("Error getting user:", error);
      return { success: false, error };
    }
  },

  async updateUser(userId, updates) {
    try {
      await updateDoc(doc(db, "users", userId), updates);
      return { success: true };
    } catch (error) {
      console.error("Error updating user:", error);
      return { success: false, error };
    }
  },

  // Items collection
  async createItem(itemData) {
    try {
      await setDoc(doc(db, "items", itemData.id), itemData);
      return { success: true };
    } catch (error) {
      console.error("Error creating item:", error);
      return { success: false, error };
    }
  },

  async getItems(filterOptions = {}) {
    try {
      let q = collection(db, "items");

      if (filterOptions.status) {
        q = query(q, where("status", "==", filterOptions.status));
      }
      if (filterOptions.donorId) {
        q = query(q, where("donorId", "==", filterOptions.donorId));
      }
      if (filterOptions.freeForNGO !== undefined) {
        q = query(q, where("freeForNGO", "==", filterOptions.freeForNGO));
      }
      if (filterOptions.orderBy) {
        q = query(q, orderBy(filterOptions.orderBy, filterOptions.order || "desc"));
      }
      if (filterOptions.limit) {
        q = query(q, limit(filterOptions.limit));
      }

      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: items };
    } catch (error) {
      console.error("Error getting items:", error);
      return { success: false, error };
    }
  },

  async updateItem(itemId, updates) {
    try {
      await updateDoc(doc(db, "items", itemId), updates);
      return { success: true };
    } catch (error) {
      console.error("Error updating item:", error);
      return { success: false, error };
    }
  },

  async deleteItem(itemId) {
    try {
      await deleteDoc(doc(db, "items", itemId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting item:", error);
      return { success: false, error };
    }
  },

  // NGO requests collection
  async createNGORequest(ngoData) {
    try {
      await setDoc(doc(db, "ngo_requests", ngoData.id), ngoData);
      return { success: true };
    } catch (error) {
      console.error("Error creating NGO request:", error);
      return { success: false, error };
    }
  },

  async getNGORequests(filterOptions = {}) {
    try {
      let q = collection(db, "ngo_requests");

      if (filterOptions.status) {
        q = query(q, where("status", "==", filterOptions.status));
      }
      if (filterOptions.userId) {
        q = query(q, where("userId", "==", filterOptions.userId));
      }
      if (filterOptions.orderBy) {
        q = query(q, orderBy(filterOptions.orderBy, filterOptions.order || "desc"));
      }

      const querySnapshot = await getDocs(q);
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: requests };
    } catch (error) {
      console.error("Error getting NGO requests:", error);
      return { success: false, error };
    }
  },

  async updateNGORequest(requestId, updates) {
    try {
      await updateDoc(doc(db, "ngo_requests", requestId), updates);
      return { success: true };
    } catch (error) {
      console.error("Error updating NGO request:", error);
      return { success: false, error };
    }
  },

  // Cart collection
  async saveCart(userId, cartData) {
    try {
      await setDoc(doc(db, "carts", userId), { items: cartData, updatedAt: Date.now() });
      return { success: true };
    } catch (error) {
      console.error("Error saving cart:", error);
      return { success: false, error };
    }
  },

  async getCart(userId) {
    try {
      const docRef = doc(db, "carts", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data().items || [] };
      } else {
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error("Error getting cart:", error);
      return { success: false, error };
    }
  },

  // Wishlist collection
  async saveWishlist(userId, wishlistData) {
    try {
      await setDoc(doc(db, "wishlists", userId), { items: wishlistData, updatedAt: Date.now() });
      return { success: true };
    } catch (error) {
      console.error("Error saving wishlist:", error);
      return { success: false, error };
    }
  },

  async getWishlist(userId) {
    try {
      const docRef = doc(db, "wishlists", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data().items || [] };
      } else {
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error("Error getting wishlist:", error);
      return { success: false, error };
    }
  },

  // File upload
  async uploadFile(file, path) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { success: true, url: downloadURL };
    } catch (error) {
      console.error("Error uploading file:", error);
      return { success: false, error };
    }
  },

  // Authentication helpers
  async signUpUser(email, password, userData) {
    try {
      console.log('Attempting to sign up user:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created successfully:', user.uid);

      // Save additional user data
      const fullUserData = {
        ...userData,
        id: user.uid,
        email: user.email,
        createdAt: Date.now()
      };

      const saveResult = await this.createUser(fullUserData);
      if (!saveResult.success) {
        console.error('Failed to save user data:', saveResult.error);
      }

      return { success: true, user: fullUserData };
    } catch (error) {
      console.error("Error signing up:", error);
      return { success: false, error: error };
    }
  },

  async signInUser(email, password) {
    try {
      console.log('Attempting to sign in user:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User signed in successfully:', user.uid);

      // Get additional user data
      const userData = await this.getUser(user.uid);
      if (userData.success) {
        return { success: true, user: userData.data };
      } else {
        // If user data doesn't exist, create basic user data
        const basicUserData = {
          id: user.uid,
          email: user.email,
          name: user.email.split('@')[0],
          role: 'customer', // Default role
          createdAt: Date.now()
        };
        await this.createUser(basicUserData);
        return { success: true, user: basicUserData };
      }
    } catch (error) {
      console.error("Error signing in:", error);
      return { success: false, error: error };
    }
  },

  async signOutUser() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error("Error signing out:", error);
      return { success: false, error };
    }
  },

  // Google Authentication
  async signInWithGoogle() {
    try {
      console.log('Attempting Google sign in...');
      
      // Clear any existing auth state first
      await signOut(auth).catch(() => {});
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Google sign in successful:', user.uid);

      // Check if user data exists
      const userData = await this.getUser(user.uid);
      if (userData.success) {
        return { success: true, user: userData.data };
      } else {
        // Create new user data for Google sign-in
        const newUserData = {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL,
          role: 'customer', // Default role for Google sign-in
          provider: 'google',
          createdAt: Date.now()
        };
        
        const saveResult = await this.createUser(newUserData);
        if (saveResult.success) {
          return { success: true, user: newUserData, isNewUser: true };
        } else {
          console.error('Failed to save Google user data:', saveResult.error);
          return { success: false, error: saveResult.error };
        }
      }
    } catch (error) {
      console.error("Error with Google sign in:", error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/popup-blocked') {
        return { success: false, error: { message: 'Popup was blocked. Please allow popups and try again.' } };
      } else if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, error: { message: 'Sign-in was cancelled.' } };
      } else if (error.code === 'auth/unauthorized-domain') {
        return { success: false, error: { message: 'This domain is not authorized for Google sign-in.' } };
      } else {
        return { success: false, error: { message: error.message || 'Google sign-in failed. Please try again.' } };
      }
    }
  },

  // Initialize sample data
  async initializeSampleData() {
    try {
      // Check if sample data already exists
      const itemsResult = await this.getItems({ limit: 1 });
      if (itemsResult.success && itemsResult.data.length > 0) {
        return { success: true, message: "Sample data already exists" };
      }

      // Sample products
      const sampleProducts = [
        {
          id: 'prod_1',
          name: 'Vintage Denim Jacket',
          type: 'jacket',
          size: 'M',
          gender: 'unisex',
          condition: 'excellent',
          price: 750,
          originalPrice: 3000,
          images: ['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400'],
          description: 'Classic blue denim jacket in excellent condition',
          donor: 'John Doe',
          donorId: 'sample_donor_1',
          status: 'approved',
          freeForNGO: false,
          createdAt: Date.now() - 86400000
        },
        {
          id: 'prod_2',
          name: 'Floral Summer Dress',
          type: 'dress',
          size: 'S',
          gender: 'female',
          condition: 'good',
          price: 600,
          originalPrice: 2400,
          images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400'],
          description: 'Beautiful floral print summer dress',
          donor: 'Sarah Smith',
          donorId: 'sample_donor_2',
          status: 'approved',
          freeForNGO: false,
          createdAt: Date.now() - 172800000
        },
        {
          id: 'prod_3',
          name: 'Cotton White Shirt',
          type: 'shirt',
          size: 'L',
          gender: 'male',
          condition: 'excellent',
          price: 400,
          originalPrice: 1600,
          images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400'],
          description: 'Crisp white cotton formal shirt',
          donor: 'Mike Johnson',
          donorId: 'sample_donor_3',
          status: 'approved',
          freeForNGO: true,
          createdAt: Date.now() - 259200000
        },
        {
          id: 'prod_4',
          name: 'Designer Sneakers',
          type: 'shoes',
          size: '9',
          gender: 'unisex',
          condition: 'good',
          price: 1200,
          originalPrice: 4800,
          images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
          description: 'Trendy designer sneakers in great condition',
          donor: 'Alex Chen',
          donorId: 'sample_donor_4',
          status: 'approved',
          freeForNGO: false,
          createdAt: Date.now() - 345600000
        }
      ];

      // Create sample items
      for (const product of sampleProducts) {
        await this.createItem(product);
      }

      // Sample NGO request
      const sampleNGO = {
        id: 'ngo_1',
        ngoName: 'Helping Hands Foundation',
        registrationNumber: 'NGO001',
        contactPerson: 'Priya Sharma',
        designation: 'Director',
        phone: '+91 9876543210',
        email: 'priya@helpinghands.org',
        address: 'Mumbai, Maharashtra',
        serviceAreas: 'Mumbai, Thane, Navi Mumbai',
        description: 'A foundation dedicated to helping underprivileged communities',
        website: 'https://helpinghands.org',
        userId: 'sample_ngo_user',
        status: 'pending',
        submittedAt: Date.now() - 86400000
      };

      await this.createNGORequest(sampleNGO);

      return { success: true, message: "Sample data initialized successfully" };
    } catch (error) {
      console.error("Error initializing sample data:", error);
      return { success: false, error };
    }
  }
};