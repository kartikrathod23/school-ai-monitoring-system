import numpy as np
import pandas as pd

import torch
import torch.nn as nn
from torch.utils.data import (
    Dataset,
    DataLoader
)

from src.config import (
    EMBEDDINGS_PATH,
    TRAINING_METADATA_PATH,
    CLASSIFIER_PTH_PATH,
    BATCH_SIZE,
    EPOCHS,
    LEARNING_RATE
)

from src.classifier.model import (
    AttendanceClassifier
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# DATASET
# ============================================================

class EmbeddingDataset(Dataset):

    def __init__(
        self,
        embeddings,
        labels
    ):

        self.embeddings = torch.tensor(
            embeddings,
            dtype=torch.float32
        )

        self.labels = torch.tensor(
            labels,
            dtype=torch.long
        )

    def __len__(
        self
    ):

        return len(
            self.labels
        )

    def __getitem__(
        self,
        idx
    ):

        return (
            self.embeddings[idx],
            self.labels[idx]
        )


# ============================================================
# TRAINER
# ============================================================

class ClassifierTrainer:

    def __init__(self):

        pass

    # ========================================================
    # LOAD DATA
    # ========================================================

    def load_data(
        self
    ):

        embeddings = np.load(
            EMBEDDINGS_PATH
        )

        metadata = pd.read_csv(
            TRAINING_METADATA_PATH
        )

        labels = metadata[
            "class_id"
        ].values

        num_classes = len(
            np.unique(
                labels
            )
        )

        print()
        print("Embeddings Shape:")
        print(
            embeddings.shape
        )

        print()
        print("Labels Shape:")
        print(
            labels.shape
        )

        print()
        print("Classes:")
        print(
            num_classes
        )

        return (
            embeddings,
            labels,
            num_classes
        )

    # ========================================================
    # CREATE DATALOADER
    # ========================================================

    def create_loader(
        self,
        embeddings,
        labels
    ):

        dataset = (
            EmbeddingDataset(
                embeddings,
                labels
            )
        )

        loader = DataLoader(
            dataset,
            batch_size=BATCH_SIZE,
            shuffle=True
        )

        return loader

    # ========================================================
    # TRAIN
    # ========================================================

    def train(
        self
    ):

        (
            embeddings,
            labels,
            num_classes
        ) = self.load_data()

        loader = self.create_loader(
            embeddings,
            labels
        )

        model = (
            AttendanceClassifier(
                num_classes=num_classes
            )
            .to(DEVICE)
        )

        criterion = (
            nn.CrossEntropyLoss()
        )

        optimizer = (
            torch.optim.Adam(
                model.parameters(),
                lr=LEARNING_RATE
            )
        )

        print()
        print(
            "=" * 50
        )
        print(
            "TRAINING STARTED"
        )
        print(
            "=" * 50
        )

        for epoch in range(
            EPOCHS
        ):

            model.train()

            running_loss = 0.0

            correct = 0

            total = 0

            for (
                batch_embeddings,
                batch_labels
            ) in loader:

                batch_embeddings = (
                    batch_embeddings
                    .to(DEVICE)
                )

                batch_labels = (
                    batch_labels
                    .to(DEVICE)
                )

                optimizer.zero_grad()

                outputs = model(
                    batch_embeddings
                )

                loss = criterion(
                    outputs,
                    batch_labels
                )

                loss.backward()

                optimizer.step()

                running_loss += (
                    loss.item()
                )

                predictions = (
                    outputs.argmax(
                        dim=1
                    )
                )

                correct += (
                    predictions ==
                    batch_labels
                ).sum().item()

                total += len(
                    batch_labels
                )

            epoch_loss = (
                running_loss
                /
                len(loader)
            )

            epoch_acc = (
                correct
                /
                total
            )

            print(
                f"Epoch "
                f"{epoch + 1:03d}/"
                f"{EPOCHS} | "
                f"Loss: "
                f"{epoch_loss:.4f} | "
                f"Accuracy: "
                f"{epoch_acc:.4f}"
            )

        print()
        print(
            "=" * 50
        )
        print(
            "TRAINING COMPLETE"
        )
        print(
            "=" * 50
        )

        torch.save(
            model.state_dict(),
            CLASSIFIER_PTH_PATH
        )

        print()
        print(
            "Saved:"
        )
        print(
            CLASSIFIER_PTH_PATH
        )

        return model

    # ========================================================
    # EVALUATE ON TRAINING SET
    # ========================================================

    def evaluate(
        self,
        model
    ):

        (
            embeddings,
            labels,
            _
        ) = self.load_data()

        model.eval()

        with torch.no_grad():

            x = torch.tensor(
                embeddings,
                dtype=torch.float32
            ).to(DEVICE)

            outputs = model(x)

            predictions = (
                outputs.argmax(
                    dim=1
                )
                .cpu()
                .numpy()
            )

        accuracy = (
            (
                predictions
                ==
                labels
            )
            .mean()
        )

        print()
        print(
            "Training Accuracy:"
        )
        print(
            f"{accuracy:.4f}"
        )

        return accuracy


# ============================================================
# PUBLIC FUNCTION
# ============================================================

def train_classifier():

    trainer = (
        ClassifierTrainer()
    )

    model = trainer.train()

    trainer.evaluate(
        model
    )

    return model