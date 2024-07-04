import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Image, Button, Text, ActivityIndicator, Modal, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { SHA256 } from 'crypto-js';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';


export default function App() {
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [permission, requestPermission ] = useCameraPermissions();
  const [imageUri, setImageUri] = useState(null);
  const [photo, setPhoto] = useState(null);  
  const [previewVisible, setPreviewVisible] = useState(false);
  const [verification, setVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [imageGridVisible, setImageGridVisible] = useState(false);
  const cameraRef = useRef(null);

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const handleRetry = () => {
    setImageUri(null);
    setPreviewVisible(false);
    setVerification(false);
  };

  const handleProceed = async () => {


    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      setIsLoading(false);
      setMessage('No internet connection.');
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
      }, 5000);
      return; // Exit the function if there is no internet
    }
    setIsLoading(true);

    try {
      const imageData = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
      const hash_value = SHA256(imageData).toString();
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);


      const creationTime = assetInfo.creationTime;
      const id = assetInfo.id;
      
      const uuid = `${creationTime}-${id}`
      const payload = { uuid, hash_value };
      console.log(payload)

      fetch('https://spidercodes.pythonanywhere.com/api/v1/upload/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then(response => response.json())
        .then(response => {
          setIsLoading(false);
          setMessage(response);
          setShowModal(true);
          setTimeout(() => {
            setShowModal(false);
            setPreviewVisible(false)
          }, 5000); // Dismiss the modal after 5 seconds
          
        })
        .catch((error) => {
          setIsLoading(false);
          setMessage(error);
          setShowModal(true);
          setTimeout(() => {
            setShowModal(false);
          }, 5000);
        });
    } catch (error) {
      setIsLoading(false);
      console.error("Failed to process image:",error);
      setMessage(error);
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
      }, 5000);
    }
  };

  const verify = async () => {

    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      setIsLoading(false);
      setMessage('No internet connection.');
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
      }, 5000);
      return; // Exit the function if there is no internet
    }
    setIsLoading(true);
    try {
      
      // Read image data as a base64 string
      const imageData = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
      const hash_value = SHA256(imageData).toString(); // Compute SHA256 hash
      

      const info = await MediaLibrary.getAssetInfoAsync(photo.id);
      const creationTime = info.creationTime;
      const id = info.id;
      uuid = `${creationTime}-${id}`
      console.log(uuid);

      const payload = { uuid, hash_value };
      console.log(payload)
  
      // POST request to the verification endpoint
      fetch('https://spidercodes.pythonanywhere.com/api/v1/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      .then(response => response.json())
      .then(response => {
        setIsLoading(false);
        setMessage(response); 
        console.log(response);
        setShowModal(true);
        setTimeout(() => {
          setShowModal(false);
        }, 5000); // Dismiss the modal after 5 seconds
      })
      .catch((error) => {
        setIsLoading(false);
        setMessage(error); 
        setShowModal(true);
        setTimeout(() => {
          setShowModal(false);
        }, 5000);
      });
    } catch (error) {
      setIsLoading(false);
      console.error(error);
      setMessage(error);
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
      }, 5000);
    }
  };

  const handleImageSelected = async (image) => {
    setImageGridVisible(false);
    setImageUri(image.uri);
    setPreviewVisible(true);
    setVerification(true);
    setPhoto(image)
  };

  const ImageGridSelector = ({ isVisible, onClose }) => {
    const [images, setImages] = useState([]);
  
    useEffect(() => {
      (async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {

            const { assets }  = await MediaLibrary.getAssetsAsync({
              mediaType: MediaLibrary.MediaType.photo,
              first: 500, // Adjust 'first' as needed, based on performance considerations
            });
    
          assets.sort((a, b) => b.creationTime - a.creationTime);
  
          setImages(assets);
        }
      })();
    }, []);

    return (
      <Modal visible={isVisible} onRequestClose={onClose} animationType="slide">
        <View style={{ flex: 1 }}>
          <FlatList
            data={images}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleImageSelected(item)}>
                <Image source={{ uri: item.uri }} style={{ width: 100, height: 100 }} />
              </TouchableOpacity>
            )}
            numColumns={4}
            initialNumToRender={10}  // Render fewer items initially
            maxToRenderPerBatch={5}  // Number of items to render per batch
            windowSize={2}  // Reduce the size of the offscreen area that is rendered
            removeClippedSubviews={true}  // Unmount components that are off-screen
          
          />
          <View style={styles.buttonContainer}>
            <Button title="Close" onPress={onClose} />
          </View>
        </View>
      </Modal>
    );
  };

  const selectMedia = () => {
    setImageGridVisible(true);
  };


  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={(requestPermission)}>
          <FontAwesome name="camera" size={50} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <ImageGridSelector isVisible={imageGridVisible} onClose={() => setImageGridVisible(false)} /> 

      {!previewVisible ? (
        <View style={styles.container}>
          <View style={styles.topIcon}>
          <TouchableOpacity onPress={toggleFlash}>
              {flash === 'on' ? (
                <MaterialCommunityIcons name="flash-off" size={32} color="white" />
              ) : (
                <MaterialCommunityIcons name="flash" size={32} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <CameraView style={styles.camera} ref={cameraRef} facing={facing} flash={flash}>

      
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={selectMedia}>
                <MaterialCommunityIcons name="folder-image" size={32} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const options = { quality: 1, base64: true, exif: true };
                const data = await cameraRef.current.takePictureAsync(options);
                setPreviewVisible(true);
                setImageUri(data.uri);
                
              }}>
                <MaterialCommunityIcons name="camera" size={32} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                <MaterialCommunityIcons name="camera-switch" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.fullSizeImage} />
          { !verification ? (
          <View style={styles.buttonContainer} >
           <Button title="Retry" style={styles.buttonStyle} onPress={handleRetry} />
           <Button title="Proceed" style={styles.buttonStyle} onPress={handleProceed} /> 
          </View> ) : (
          <>
          <MaterialCommunityIcons style={styles.closeIcon} name='close' color="white" size={30} onPress={handleRetry}/>
          <View style={styles.buttonContainer}>
            <Button title="Back" onPress={selectMedia} />
            <Button title="Verify" onPress={verify}/>
          </View>
          </>
          )}
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="grey" />
        </View>
      )}

      {showModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showModal}
          onRequestClose={() => {
            setShowModal(false);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>{message}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    color: 'white',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '90%',
    position: 'absolute',
    bottom: 0,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    width: '100%',
    padding: 20,
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.5)',  // semi-transparent background
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '90%',
    position: 'absolute',
    bottom: 0,
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'grey',
    borderRadius: 5,
    padding: 10,              // Reduced padding
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // width: '80%',             // Width control for modal
    // maxHeight: '30%',         // Max height control for modal
  },
    modalText: {
    textAlign: 'center',
    color: 'white'
  },
  closeIcon: {
    position: 'absolute',
    right: 20,
    top: -30
  },
  topIcon: {
    position: 'absolute',
    top: 20,
    flexDirection: 'row',
    width: '100%',
    // padding: 20,
    justifyContent: 'space-around',
  },
});
