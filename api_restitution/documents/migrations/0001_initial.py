import django.db.models.deletion
from django.db import migrations, models
from pgvector.django import VectorField


class Migration(migrations.Migration):

    initial = True
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titre', models.CharField(max_length=255)),
                ('fichier', models.FileField(upload_to='documents/')),
                ('categorie', models.CharField(
                    choices=[('general', 'Général'), ('financier', 'Financier'),
                              ('geographique', 'Géographique'), ('temporel', 'Temporel')],
                    default='general', max_length=20,
                )),
                ('statut', models.CharField(
                    choices=[('en_attente', 'En attente'), ('indexation', 'Indexation en cours'),
                              ('indexe', 'Indexé'), ('erreur', 'Erreur')],
                    default='en_attente', max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='DocumentChunk',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texte', models.TextField()),
                ('embedding', VectorField(dimensions=768)),
                ('position', models.IntegerField()),
                ('document', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='chunks',
                    to='documents.document',
                )),
            ],
            options={'ordering': ['position']},
        ),
    ]
