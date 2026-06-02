import cv2, os

folder = "group_photos"
photos = sorted(os.listdir(folder))

for photo in photos:
    path = os.path.join(folder, photo)
    img = cv2.imread(path)
    # resize for screen
    h, w = img.shape[:2]
    scale = min(1200/w, 800/h)
    img = cv2.resize(img, (int(w*scale), int(h*scale)))
    cv2.imshow(f"WHO IS IN THIS PHOTO? → {photo}", img)
    print(f"\nPhoto: {photo}")
    print("System said present:", end=" ")
    cv2.waitKey(0)
    cv2.destroyAllWindows()
