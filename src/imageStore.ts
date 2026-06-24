const databaseName = "my-wardrobe";
const databaseVersion = 1;
const imageStoreName = "images";

const openImageDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(imageStoreName)) {
        database.createObjectStore(imageStoreName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runImageTransaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const database = await openImageDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(imageStoreName, mode);
    const store = transaction.objectStore(imageStoreName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
};

export const saveImageBlob = async (file: Blob) => {
  const imageId = crypto.randomUUID();
  await runImageTransaction("readwrite", (store) => store.put(file, imageId));
  return imageId;
};

export const getImageBlob = (imageId: string) =>
  runImageTransaction<Blob | undefined>("readonly", (store) => store.get(imageId));

export const deleteImageBlob = (imageId: string) =>
  runImageTransaction<undefined>("readwrite", (store) => store.delete(imageId));
